function "Discord/PollSendToSlack" {
  input {
  }

  stack {
    var $channel_id {
      value = 1234567890123456789
      disabled = true
      description = "#test-channel"
    }

    var $channel_id {
      value = 9876543210987654321
      description = "#example-channel"
    }
  
    db.query discord_messages {
      sort = {
        "discord_messages.created_at": "desc"
      }
      return = {
        type : "single"
      }
    
    } as $discord_messages
  
    var $after {
      value = $discord_messages.message_id ?? null
    }
  
    debug.stop {
      value = $discord_messages
      disabled = true
    }
  
    api.request {
      url = "https://discord.com/api/v10/channels/:CHANNEL_ID/messages"|replace:":CHANNEL_ID":$channel_id
      method = "GET"
      params = {}|set:"limit":"100"|set_ifnotnull:"after":$after
      headers = []|push:"Authorization: Bot "~$env.discord_bot_key|push:"User-Agent: DiscordBot (your_url, 1.0.0)"
    } as $discord_list_messages_api
  
    var $messages {
      value = $discord_list_messages_api|sort:"timestamp":"itext":true
    }
  
    debug.stop {
      value = $messages
      disabled = true
    }
  
    foreach ($messages) {
      each as $message {
        var $message_id {
          value = $message.id
        }
      
        var $channel_id {
          value = $message.channel_id
        }
      
        var $ref_message_id {
          value = $message.referenced_message.id ?? $message.message_reference.message_id
        }
      
        var $author {
          value = $message.author
        }
      
        var $content {
          value = $message.referenced_message.content ?? $message.content
        }
      
        conditional {
          if ($content|is_empty) {
            function.run "Discord/GetMessageByID" {
              input = {
                message_id: $ref_message_id
                channel_id: $message.message_reference.channel_id
              }
            } as $discord_message
          
            debug.stop {
              value = $discord_message
              disabled = true
            }
          
            var $content {
              value = $discord_message.content
            }
          }
        }
      
        var $discord_url {
          value = ```
            "https://discord.com/channels/:SERVER_ID/:CHANNEL_ID/:MESSAGE_ID"
            |replace:":CHANNEL_ID":$channel_id
            |replace:":MESSAGE_ID":$message_id
            ```
        }
      
        function.run "sendSlackMessage/DiscordMessagetoSlack" {
          input = {
            content    : $content
            username   : $author.username
            discord_url: $discord_url
          }
        } as $slack_post
      
        db.add_or_edit discord_messages {
          field_name = "message_id"
          field_value = $message_id
          data = {
            created_at     : $message.timestamp
            ref_message_id : $ref_message_id
            slack_ts       : $slack_post.ts
            content        : $content
            author_username: $author.username
            author_id      : $author.id
            discord_url    : $discord_url
          }
        } as $discord_message
      
        debug.stop {
          value = $discord_message
          disabled = true
        }
      }
    }
  }

  response = $discord_list_messages_api
}