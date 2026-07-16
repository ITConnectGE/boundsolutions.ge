<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateMailboxInboundEmailsTable extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('mailbox_inbound_emails', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('message_id');
            $table->longText('message');
            // Denormalized fields for a cheap admin inbox list (populated on receipt).
            $table->string('from_email')->nullable();
            $table->string('from_name')->nullable();
            $table->string('to_email')->nullable();
            $table->text('subject')->nullable();
            $table->text('preview')->nullable();
            $table->boolean('has_attachments')->default(false);
            $table->timestamp('received_at')->nullable()->index();
            $table->timestamp('read_at')->nullable();
            $table->nullableTimestamps();
        });
    }
    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::dropIfExists('mailbox_inbound_emails');
    }
}
