<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed.']);
    exit;
}

$rawBody = file_get_contents('php://input') ?: '';
$payload = json_decode($rawBody, true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid request.']);
    exit;
}

$data = is_array($payload['lead'] ?? null) ? $payload['lead'] : [];
$estimate = is_array($payload['estimate'] ?? null) ? $payload['estimate'] : [];

if (!empty($data['website'])) {
    echo json_encode(['ok' => true]);
    exit;
}

function clean_text(mixed $value): string
{
    $text = trim((string) $value);
    $text = preg_replace('/[\r\n]+/', ' ', $text) ?? '';
    return substr($text, 0, 500);
}

function clean_multiline(mixed $value): string
{
    $text = trim((string) $value);
    $text = preg_replace('/[^\P{C}\n\t]/u', '', $text) ?? '';
    return substr($text, 0, 2000);
}

$contactName = clean_text($data['contactName'] ?? '');
$email = filter_var(clean_text($data['email'] ?? ''), FILTER_VALIDATE_EMAIL);
$phone = clean_text($data['phone'] ?? '');
$jobLocation = clean_text($data['jobLocation'] ?? '');
$projectName = clean_text($data['projectName'] ?? '');

if ($contactName === '' || !$email || $phone === '' || $jobLocation === '' || $projectName === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Please complete the required contact and project fields.']);
    exit;
}

// Replace this with the inbox Legacy Block wants quote requests sent to.
$to = 'CHANGE_ME@legacyblock.com';
$subject = 'New Legacy Block quote request';

$lines = [
    'A new quote request was submitted from the Legacy Block website.',
    '',
    'Contact',
    'Name: ' . $contactName,
    'Company: ' . clean_text($data['company'] ?? ''),
    'Email: ' . $email,
    'Phone: ' . $phone,
    'Job location: ' . $jobLocation,
    '',
    'Project',
    'Project name: ' . $projectName,
    'Product type: ' . clean_text($data['productType'] ?? ''),
    'Wall length: ' . clean_text($data['length'] ?? '') . ' ft',
    'Wall height: ' . clean_text($data['height'] ?? '') . ' ft',
    'Openings: ' . clean_text($data['openings'] ?? '') . ' sq ft',
    'Block size: ' . clean_text($data['blockSize'] ?? ''),
    'Concrete core: ' . clean_text($data['coreThickness'] ?? '') . ' in',
    '',
    'Estimate',
    'Starting total: ' . clean_text($estimate['totalFormatted'] ?? ''),
    'Range: ' . clean_text($estimate['range'] ?? ''),
    'Primary units: ' . clean_text($estimate['primaryUnits'] ?? '') . ' ' . clean_text($estimate['primaryLabel'] ?? ''),
    'Net wall area: ' . clean_text($estimate['netWallArea'] ?? '') . ' sq ft',
    'Support units: ' . clean_text($estimate['supportUnits'] ?? '') . ' ' . clean_text($estimate['supportLabel'] ?? ''),
    'Fill allowance: ' . clean_text($estimate['fillCostFormatted'] ?? ''),
    'Delivery: ' . clean_text($estimate['freightFormatted'] ?? ''),
    'Tax: ' . clean_text($estimate['taxTotalFormatted'] ?? ''),
    'Pallets / bundles: ' . clean_text($estimate['bundles'] ?? ''),
    '',
    'Submitted: ' . clean_text($data['createdAt'] ?? gmdate('c')),
    'Page: ' . clean_text($_SERVER['HTTP_REFERER'] ?? ''),
];

$message = implode("\n", array_map('clean_multiline', $lines));
$headers = [
    'From: Legacy Block Website <no-reply@' . ($_SERVER['HTTP_HOST'] ?? 'legacyblock.com') . '>',
    'Reply-To: ' . $contactName . ' <' . $email . '>',
    'Content-Type: text/plain; charset=UTF-8',
];

$sent = mail($to, $subject, $message, implode("\r\n", $headers));

if (!$sent) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'The request could not be sent. Please call Legacy Block directly.']);
    exit;
}

echo json_encode(['ok' => true, 'message' => 'Thanks. Your quote request has been sent to Legacy Block.']);
