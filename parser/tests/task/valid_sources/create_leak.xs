task claim_reminders {
  description = "Runs every 6 hours to send reminders for claims stalled at the assessment, review, or approval workflow stages."

  stack {
    debug.log {
      value = "Claim reminders task started"
    }

    // --- Cutoff timestamps ---

    var $forty_eight_hours_ago {
      value = now|transform_timestamp:"-48 hours"
    }

    var $twenty_four_hours_ago {
      value = now|transform_timestamp:"-24 hours"
    }

    var $twelve_hours_ago {
      value = now|transform_timestamp:"-12 hours"
    }

    var $assessment_reminder_count {
      value = 0
    }

    var $review_reminder_count {
      value = 0
    }

    var $approval_reminder_count {
      value = 0
    }

    // === Step 1: Garage Assessment Reminders (stalled > 48h) ===

    db.query claim {
      where = ($db.claim.workflow_status == "assessment" && $db.claim.updated_at < $forty_eight_hours_ago)
    } as $assessment_claims

    foreach ($assessment_claims) {
      each as $claim {
        try_catch {
          try {
            function.run "communication/send_notification" {
              input = {
                user_id : $claim.garage_id
                claim_id: $claim.id
                message : "Reminder: Vehicle assessment for claim " ~ $claim.claim_number ~ " is awaiting your action. Please complete the assessment report at your earliest convenience."
                subject : "Assessment Reminder - Claim " ~ $claim.claim_number
              }
            }

            var.update $assessment_reminder_count {
              value = $assessment_reminder_count + 1
            }
          }
          catch {
            debug.log {
              value = {
                error       : "Failed to send assessment reminder"
                claim_number: $claim.claim_number
              }
            }
          }
        }
      }
    }

    debug.log {
      value = "Assessment reminders sent: " ~ $assessment_reminder_count
    }

    // === Step 2: Agent Review Reminders (stalled > 24h) ===

    db.query claim {
      where = ($db.claim.workflow_status == "review" && $db.claim.updated_at < $twenty_four_hours_ago)
    } as $review_claims

    foreach ($review_claims) {
      each as $claim {
        try_catch {
          try {
            function.run "communication/send_notification" {
              input = {
                user_id : $claim.assigned_agent_id
                claim_id: $claim.id
                message : "Reminder: Claim " ~ $claim.claim_number ~ " is awaiting your review. Please complete your review to keep the claim moving forward."
                subject : "Review Reminder - Claim " ~ $claim.claim_number
              }
            }

            var.update $review_reminder_count {
              value = $review_reminder_count + 1
            }
          }
          catch {
            debug.log {
              value = {
                error       : "Failed to send review reminder"
                claim_number: $claim.claim_number
              }
            }
          }
        }
      }
    }

    debug.log {
      value = "Review reminders sent: " ~ $review_reminder_count
    }

    // === Step 3: Agent Approval Reminders - URGENT (stalled > 12h) ===

    db.query claim {
      where = ($db.claim.workflow_status == "approval" && $db.claim.updated_at < $twelve_hours_ago)
    } as $approval_claims

    foreach ($approval_claims) {
      each as $claim {
        try_catch {
          try {
            function.run "communication/send_notification" {
              input = {
                user_id : $claim.assigned_agent_id
                claim_id: $claim.id
                message : "URGENT: Claim " ~ $claim.claim_number ~ " requires your immediate approval. This claim has been pending approval for over 12 hours. Please review and take action as soon as possible."
                subject : "URGENT: Approval Required - Claim " ~ $claim.claim_number
              }
            }

            var.update $approval_reminder_count {
              value = $approval_reminder_count + 1
            }
          }
          catch {
            debug.log {
              value = {
                error       : "Failed to send approval reminder"
                claim_number: $claim.claim_number
              }
            }
          }
        }
      }
    }

    debug.log {
      value = "Approval reminders sent: " ~ $approval_reminder_count
    }

    // === Step 4: Final summary ===

    debug.log {
      value = {
        assessment_reminders_sent: $assessment_reminder_count
        review_reminders_sent    : $review_reminder_count
        approval_reminders_sent  : $approval_reminder_count
        total_reminders_sent     : ($assessment_reminder_count + $review_reminder_count + $approval_reminder_count)
      }
    }
  }

  schedule = [{starts_on: 2026-01-01 00:00:00+0000, freq: 21600}]
}
