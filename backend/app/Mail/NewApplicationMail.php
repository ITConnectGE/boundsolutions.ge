<?php

namespace App\Mail;

use App\Models\Application;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Facades\Storage;

// Emailed to the team for every website submission (contact / CV / employer).
// The uploaded CV is attached when present.
class NewApplicationMail extends Mailable
{
    public function __construct(public Application $application) {}

    public function envelope(): Envelope
    {
        $a = $this->application;
        $kind = match ($a->type) {
            'cv' => 'CV',
            'company' => 'Employer request',
            default => 'Contact message',
        };
        $who = $a->name ?: $a->contact_name ?: $a->email ?: '';
        $subject = "New {$kind}" . ($who ? " — {$who}" : '');

        // Reply-To the applicant so a reply goes straight to them.
        $replyTo = $a->email ? [new Address($a->email, $who ?: $a->email)] : [];

        return new Envelope(subject: $subject, replyTo: $replyTo);
    }

    public function content(): Content
    {
        return new Content(htmlString: $this->buildHtml());
    }

    public function attachments(): array
    {
        $a = $this->application;
        if ($a->cv_path && Storage::disk('public')->exists($a->cv_path)) {
            return [Attachment::fromStorageDisk('public', $a->cv_path)->as(basename($a->cv_path))];
        }
        return [];
    }

    private function buildHtml(): string
    {
        $a = $this->application;
        $rows = [
            'Type' => $a->type,
            'Name' => $a->name,
            'Contact person' => $a->contact_name,
            'Email' => $a->email,
            'Phone' => $a->phone,
            'Position' => $a->position,
            'Sector' => $a->sector,
            'Message' => $a->message,
        ];

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2F3238;line-height:1.6">';
        $html .= '<h2 style="color:#F05553;margin:0 0 12px">New website submission</h2>';
        $html .= '<table cellpadding="6" style="border-collapse:collapse">';
        foreach ($rows as $label => $value) {
            if ($value === null || trim((string) $value) === '') {
                continue;
            }
            $v = nl2br(e($value));
            $html .= "<tr><td style='vertical-align:top;color:#888;white-space:nowrap'><strong>{$label}</strong></td><td>{$v}</td></tr>";
        }
        $html .= '</table>';
        if ($a->cv_path) {
            $html .= '<p style="color:#888;margin-top:14px">📎 CV attached to this email.</p>';
        }
        $html .= '</div>';

        return $html;
    }
}
