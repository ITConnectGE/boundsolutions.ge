<?php

namespace App\Models;

use BeyondCode\Mailbox\InboundEmail as BaseInboundEmail;
use Illuminate\Support\Str;

/**
 * Incoming email captured by laravel-mailbox (Mailgun route -> webhook).
 * We denormalize the key fields on receipt so the admin inbox list is cheap
 * (no MIME parse per row); the full body/attachments are parsed on demand.
 */
class InboundEmail extends BaseInboundEmail
{
    protected $casts = [
        'has_attachments' => 'boolean',
        'received_at' => 'datetime',
        'read_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::creating(function (self $email) {
            $email->from_email = $email->from() ?: null;
            $email->from_name = $email->fromName() ?: null;
            $email->to_email = collect($email->to())
                ->map(fn ($a) => method_exists($a, 'getEmail') ? $a->getEmail() : null)
                ->filter()->implode(', ') ?: null;
            $email->subject = $email->subject();

            $text = $email->visibleText();
            if (! $text) {
                $text = strip_tags((string) $email->html());
            }
            $email->preview = Str::limit(trim(preg_replace('/\s+/', ' ', (string) $text)), 180);

            try {
                $email->has_attachments = count($email->attachments()) > 0;
            } catch (\Throwable $e) {
                $email->has_attachments = false;
            }

            $email->received_at = $email->date() ?: now();
        });
    }

    public function isRead(): bool
    {
        return $this->read_at !== null;
    }
}
