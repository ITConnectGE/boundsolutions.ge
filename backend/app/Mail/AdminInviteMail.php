<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

// Sent to a newly invited admin (and on "resend"). Carries the temporary
// password; the panel forces it to be replaced at the first sign-in.
class AdminInviteMail extends Mailable
{
    public function __construct(
        public User $user,
        public string $temporaryPassword,
        public string $loginUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Bound Solutions - admin access');
    }

    public function content(): Content
    {
        return new Content(htmlString: $this->buildHtml());
    }

    private function buildHtml(): string
    {
        $name = e($this->user->name);
        $email = e($this->user->email);
        $password = e($this->temporaryPassword);
        $url = e($this->loginUrl);

        return <<<HTML
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2F3238;line-height:1.6">
          <h2 style="color:#F05553;margin:0 0 12px">Bound Solutions - admin access</h2>
          <p>გამარჯობა, {$name}!</p>
          <p>თქვენთვის შეიქმნა ადმინის ანგარიში. შესვლისთვის გამოიყენეთ დროებითი პაროლი:</p>
          <table cellpadding="6" style="border-collapse:collapse;background:#FFF4EA;border-radius:8px">
            <tr><td style="color:#888"><strong>ელ-ფოსტა</strong></td><td>{$email}</td></tr>
            <tr><td style="color:#888"><strong>დროებითი პაროლი</strong></td>
                <td><code style="font-size:16px;letter-spacing:1px">{$password}</code></td></tr>
          </table>
          <p style="margin:18px 0">
            <a href="{$url}" style="background:#F05553;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;display:inline-block">
              შესვლა
            </a>
          </p>
          <p style="color:#888">
            პირველივე შესვლისას სისტემა მოგთხოვთ ახალი პაროლის დაყენებას -
            დროებითი პაროლით პანელში ვერ იმუშავებთ.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:18px 0" />
          <p style="color:#888;font-size:13px">
            Hi {$name}, an admin account was created for you. Sign in at
            <a href="{$url}" style="color:#F05553">{$url}</a> with the temporary password above -
            you will be asked to set your own password before you can use the panel.
          </p>
        </div>
        HTML;
    }
}
