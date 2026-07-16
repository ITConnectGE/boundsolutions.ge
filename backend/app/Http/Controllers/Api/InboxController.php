<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\InboxReplyMail;
use App\Models\InboundEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class InboxController extends Controller
{
    /** Paginated list for the admin inbox (cheap — reads denormalized columns). */
    public function index(Request $request)
    {
        $query = InboundEmail::query()
            ->orderByDesc('received_at')
            ->orderByDesc('id');

        if ($search = trim((string) $request->get('q'))) {
            $query->where(function ($w) use ($search) {
                $w->where('from_email', 'like', "%{$search}%")
                    ->orWhere('from_name', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%")
                    ->orWhere('preview', 'like', "%{$search}%");
            });
        }

        $emails = $query->paginate(30);

        return response()->json([
            'data' => collect($emails->items())->map(fn (InboundEmail $e) => $this->summary($e))->values(),
            'meta' => [
                'current_page' => $emails->currentPage(),
                'last_page' => $emails->lastPage(),
                'total' => $emails->total(),
            ],
            'unread' => InboundEmail::whereNull('read_at')->count(),
        ]);
    }

    /** Single email (parses MIME on demand); marks it read. */
    public function show(InboundEmail $inbox)
    {
        if (! $inbox->read_at) {
            $inbox->forceFill(['read_at' => now()])->save();
        }

        return response()->json($this->detail($inbox));
    }

    /** Stream one attachment out of the stored MIME. */
    public function attachment(InboundEmail $inbox, int $index)
    {
        $parts = array_values($inbox->attachments());
        abort_unless(isset($parts[$index]), 404);
        $part = $parts[$index];

        $filename = $part->getFilename() ?: "attachment-{$index}";
        $content = $part->getContent();

        return response($content, 200, [
            'Content-Type' => $part->getContentType() ?: 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="'.addslashes($filename).'"',
            'Content-Length' => strlen($content),
        ]);
    }

    /** Send a threaded reply via the configured mailer (Mailgun). */
    public function reply(Request $request, InboundEmail $inbox)
    {
        $data = $request->validate(['body' => 'required|string']);

        if (config('mail.default') === 'log' || ! config('mail.from.address')) {
            return response()->json(['message' => 'Email sending is not configured on the server yet.'], 422);
        }

        $subject = (string) $inbox->subject();
        if (! Str::startsWith(Str::lower($subject), 're:')) {
            $subject = 'Re: '.$subject;
        }

        // reply() sets the In-Reply-To header and sends to Reply-To/From for us.
        $inbox->reply(new InboxReplyMail($subject, $data['body']));

        if (! $inbox->read_at) {
            $inbox->forceFill(['read_at' => now()])->save();
        }

        return response()->json(['ok' => true]);
    }

    public function destroy(InboundEmail $inbox)
    {
        $inbox->delete();

        return response()->json(['ok' => true]);
    }

    protected function summary(InboundEmail $e): array
    {
        return [
            'id' => $e->id,
            'from_email' => $e->from_email,
            'from_name' => $e->from_name,
            'to_email' => $e->to_email,
            'subject' => $e->subject,
            'preview' => $e->preview,
            'has_attachments' => (bool) $e->has_attachments,
            'received_at' => optional($e->received_at)->toIso8601String(),
            'read_at' => optional($e->read_at)->toIso8601String(),
        ];
    }

    protected function detail(InboundEmail $e): array
    {
        $attachments = [];
        try {
            foreach (array_values($e->attachments()) as $i => $part) {
                $attachments[] = [
                    'index' => $i,
                    'filename' => $part->getFilename() ?: "attachment-{$i}",
                    'content_type' => $part->getContentType(),
                    'size' => strlen($part->getContent()),
                ];
            }
        } catch (\Throwable $ex) {
            // ignore malformed attachments
        }

        return array_merge($this->summary($e), [
            'html' => $e->html(),
            'text' => $e->text(),
            'attachments' => $attachments,
        ]);
    }
}
