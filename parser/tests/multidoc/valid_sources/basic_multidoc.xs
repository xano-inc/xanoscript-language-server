workspace performance {
  acceptance = {ai_terms: true}
  preferences = {
    internal_docs    : false
    track_performance: true
    sql_names        : false
    sql_columns      : true
  }
}
---
table user {
  auth = true

  schema {
    // Unique user identifier
    int id
  
    // Account creation timestamp
    timestamp created_at?=now
  
    // User's display name
    text name filters=trim
  
    // User's email address
    email? email filters=trim|lower
  
    // User's hashed password
    password? password filters=min:8|minAlpha:1|minDigit:1 {
      sensitive = true
    }
  
    // User's role determining permissions
    enum role?=contributor {
      values = ["super_admin", "admin", "editor", "author", "contributor"]
    }
  
    // Reference to user's avatar in media table
    int? avatar_media_id?
  
    // User's biography or description
    text? bio? filters=trim
  
    // Whether the user account is active
    bool is_active?=true
  
    // Timestamp of user's last login
    timestamp? last_login_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree|unique", field: [{name: "email", op: "asc"}]}
    {type: "btree", field: [{name: "role", op: "asc"}]}
    {type: "btree", field: [{name: "is_active", op: "asc"}]}
  ]
}
---
table order {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    int user_id
    enum status?=pending {
      values = [
        "pending"
        "confirmed"
        "processing"
        "shipped"
        "delivered"
        "cancelled"
        "refunded"
      ]
    }
  
    decimal total
    text? notes? filters=trim
    timestamp? shipped_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "user_id", op: "asc"}]}
    {type: "btree", field: [{name: "status", op: "asc"}]}
  ]
}
---
table product {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    text name filters=trim
    text? description? filters=trim
    decimal price
    int stock?
    text category?=general
    bool is_available?=true
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree", field: [{name: "category", op: "asc"}]}
    {type: "btree", field: [{name: "is_available", op: "asc"}]}
  ]
}
---
function slow_function {
  input {
  }

  stack {
    util.sleep {
      value = 0.3
    }
  }

  response = null
}
---
function very_slow_function {
  input {
  }

  stack {
    util.sleep {
      value = 2.1
    }
  }

  response = null
}
---
function fast_function {
  input {
  }

  stack {
    util.sleep {
      value = 0.07
    }
  }

  response = null
}
---
// Calculates shipping cost - fails ~10% of the time
// Calculates shipping cost for an order. Fails ~10% simulating rate API errors.
function calculate_shipping {
  input {
    decimal order_total
    text destination?=domestic
  }

  stack {
    // generate random number
    security.random_number {
      min = 1
      max = 10
    } as $roll
  
    precondition ($roll > 2) {
      error_type = "accessdenied"
      error = "Shipping rate API error: carrier service returned HTTP 502 Bad Gateway"
      payload = "new error"
    }
  
    var $rate {
      value = 0.05
    }
  
    conditional {
      if ($input.destination == "international") {
        var.update $rate {
          value = 0.15
        }
      }
    }
  
    var $shipping_cost {
      value = $input.order_total * $rate
    }
  
    var $shipping_cost_min {
      value = $shipping_cost|max:4.99
    }
  }

  response = {
    cost       : $shipping_cost_min
    destination: $input.destination
  }
}
---
// Sends a notification - fails ~15% of the time
// Processes and sends a customer notification. Fails ~15% simulating email/SMS provider errors.
function process_notification {
  input {
    int user_id
    text message
    text channel?=email
  }

  stack {
    // generate random number
    security.random_number {
      min = 1
      max = 20
    } as $roll
  
    // ~10% chance: provider timeout
    precondition ($roll > 2) {
      error = "Notification delivery failed: email provider timeout after 15s"
    }
  
    // ~5% chance: rate limit
    precondition ($roll != 3) {
      error = "Notification rate limit exceeded: too many messages sent in the last minute"
    }
  
    util.sleep {
      value = 0.1
    }
  }

  response = {
    sent   : true
    channel: $input.channel
    user_id: $input.user_id
  }
}
---
// Validates order data - fails ~10% of the time
// Validates order data against business rules. Fails ~10% simulating validation service errors.
function validate_order {
  input {
    int order_id
  }

  stack {
    // generate random number
    security.random_number {
      min = 1
      max = 10
    } as $roll
  
    precondition ($roll > 1) {
      error = "Order validation service unavailable: upstream dependency timeout"
    }
  
    db.get order {
      field_name = "id"
      field_value = $input.order_id
    } as $order
  
    precondition ($order != null) {
      error_type = "notfound"
      error = "Order not found for validation"
    }
  
    var $is_valid {
      value = $order.total > 0
    }
  }

  response = {valid: $is_valid, order_id: $input.order_id}
}
---
api_group Authentication {
  canonical = "kwcyykeJ"
  swagger = {token: "3Qq1HVQTgUC_G7W3MUtTep6PNZk"}
}
---
// Store API for error dashboard testing
api_group Store {
  canonical = "errtest-store"
  swagger = {token: "errtest-swagger-token"}
  history = 100
}
---
// Login and retrieve an authentication token
query "auth/login" verb=POST {
  api_group = "Authentication"

  input {
    email email? filters=trim|lower
    text password?
  }

  stack {
    db.get user {
      field_name = "email"
      field_value = $input.email
      output = ["id", "created_at", "name", "email", "password"]
    } as $user
  
    !api.request {
      url = "https://swapi.info/api/species/26"
      method = "GET"
    } as $api1
  
    precondition ($user != null) {
      error_type = "accessdenied"
      error = "Invalid Credentials."
    }
  
    function.run fast_function as $func2
    security.check_password {
      text_password = $input.password
      hash_password = $user.password
    } as $pass_result
  
    function.run slow_function as $func1
    precondition ($pass_result) {
      error_type = "accessdenied"
      error = "Invalid Credentials."
    }
  
    function.run very_slow_function as $func3
    security.create_auth_token {
      table = "user"
      extras = {}
      expiration = 86400
      id = $user.id
    } as $authToken
  }

  response = {authToken: $authToken}
}
---
// Get the user record belonging to the authentication token
query "auth/me" verb=GET {
  api_group = "Authentication"
  auth = "user"

  input {
  }

  stack {
    db.get user {
      field_name = "id"
      field_value = $auth.id
      output = ["id", "created_at", "name", "email"]
    } as $user
  }

  response = $user
}
---
// Signup and retrieve an authentication token
query "auth/signup" verb=POST {
  api_group = "Authentication"

  input {
    text name?
    email email? filters=trim|lower
    text password?
  }

  stack {
    db.get user {
      field_name = "email"
      field_value = $input.email
    } as $user
  
    precondition ($user == null) {
      error_type = "accessdenied"
      error = "This account is already in use."
    }
  
    db.add user {
      data = {
        created_at: "now"
        name      : $input.name
        email     : $input.email
        password  : $input.password
      }
    } as $user
  
    security.create_auth_token {
      table = "user"
      extras = {}
      expiration = 86400
      id = $user.id
    } as $authToken
  }

  response = {authToken: $authToken}
}
---
// Check inventory levels - ~10% chance of 500
// Check inventory levels. Randomly fails ~10% to simulate external inventory service errors.
query "inventory/check" verb=GET {
  api_group = "Store"

  input {
    text? category?
  }

  stack {
    security.random_number {
      min = 1
      max = 10
    } as $roll
  
    precondition ($roll > 1) {
      error = "Inventory service error: failed to connect to warehouse management system"
    }
  
    db.query product {
      where = $db.product.is_available == true && $db.product.category ==? $input.category
      sort = {product.stock: "asc"}
      return = {type: "list"}
    } as $products
  
    var $low_stock {
      value = $products|filter:$$.stock < 10
    }
  
    var $out_of_stock {
      value = $products|filter:$$.stock == 0
    }
  }

  response = {
    total_products    : $products|count
    low_stock_count   : $low_stock|count
    out_of_stock_count: $out_of_stock|count
    low_stock_items   : $low_stock
  }
}
---
// Send a notification - calls process_notification function
// Send a customer notification via the notification function.
query "notifications/send" verb=POST {
  api_group = "Store"

  input {
    int user_id
    text message
    text channel?=email
  }

  stack {
    function.run process_notification {
      input = {
        user_id: $input.user_id
        message: $input.message
        channel: $input.channel
      }
    } as $result
  }

  response = $result
}
---
// List orders - ~10% chance of 500 "query error"
// List orders. Randomly fails ~10% of the time to simulate query errors.
query orders verb=GET {
  api_group = "Store"
  auth = "user"

  input {
    int page?=1
    int per_page?=25
  }

  stack {
    // Generate a number
    security.random_number {
      min = 1
      max = 10
    } as $roll
  
    precondition ($roll > 1) {
      error = "Query execution error: orders table lock timeout exceeded"
    }
  
    db.query order {
      where = $db.order.user_id == $auth.id
      sort = {order.created_at: "desc"}
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.per_page}
      }
    } as $orders
  }

  response = $orders
}
---
// Create a new order - ~10% chance of 400 or 500
// Create a new order. Randomly fails ~10% with validation or processing errors.
query orders verb=POST {
  api_group = "Store"
  auth = "user"

  input {
    int product_id
    int quantity?=1
    text? notes?
  }

  stack {
    // Random number generation
    security.random_number {
      min = 1
      max = 10
    } as $roll
  
    // ~5% chance: bad request
    precondition ($roll != 1) {
      error_type = "inputerror"
      error = "Invalid order data: product quantity exceeds maximum allowed (500)"
    }
  
    conditional {
      if ($roll == 5) {
        db.direct_query {
          sql = """
            -- Example - Query using mvpw prefix: 
            --   SELECT id, xdo FROM mvpw500_3913 WHERE xdo->>'status' = 'active'; 
            
            -- Note: The mvpw prefix returns raw data structure with id and xdo columns. 
            -- Replace 500 with your workspace ID and 3913 with your table ID. 
            
            -- Example - Query using x prefix:
            --   SELECT * FROM x500_3913 WHERE created_at > NOW() - INTERVAL '7 days'; 
            
            -- Note: The x prefix provides a more readable view with flattened columns. 
            -- Ideal for simple read operations and better readability. 
            -- Does not support write operations.
            
            
            -- Example - Query using custom view:
            --   SELECT * FROM "active_customers" WHERE signup_date > '2025-01-01'; 
            
            -- Note: Replace "active_customers" with your custom view alias. 
            -- Create custom views in database table settings with a Database View Alias. 
            -- Custom views make complex queries more maintainable.
            SELECT id, xdo FROM mvpw500_3913 WHERE xdo->>'status' = 'active';
            """
          parser = "template_engine"
          response_type = "list"
        } as $x1
      }
    }
  
    // ~5% chance: internal error
    precondition ($roll != 2) {
      error = "Order processing failed: inventory check service unavailable"
    }
  
    db.get product {
      field_name = "id"
      field_value = $input.product_id
    } as $product
  
    precondition ($product != null) {
      error_type = "notfound"
      error = "Product not found"
    }
  
    var $total {
      value = $product.price * $input.quantity
    }
  
    db.add order {
      data = {
        user_id: $auth.id
        total  : $total
        status : "pending"
        notes  : $input.notes
      }
    } as $order
  }

  response = $order
}
---
// Validate an order - calls validate_order function
// Validate an order via the validation function.
query "orders/validate" verb=POST {
  api_group = "Store"

  input {
    int order_id
  }

  stack {
    function.run validate_order {
      input = {order_id: $input.order_id}
    } as $validation
  }

  response = $validation
}
---
// Get order by ID - ~10% chance of 404
// Get order by ID. Randomly fails ~10% of the time to simulate missing records.
query "orders/{order_id}" verb=GET {
  api_group = "Store"
  auth = "user"

  input {
    int order_id
  }

  stack {
    // Random number generation
    security.random_number {
      min = 1
      max = 10
    } as $roll
  
    precondition ($roll > 1) {
      error_type = "notfound"
      error = "Order not found: order may have been deleted or does not belong to your account"
    }
  
    db.get order {
      field_name = "id"
      field_value = $input.order_id
    } as $order
  
    precondition ($order != null) {
      error_type = "notfound"
      error = "Order not found"
    }
  
    precondition ($order.user_id == $auth.id) {
      error_type = "accessdenied"
      error = "You do not have access to this order"
    }
  }

  response = $order
}
---
// Process payment - ~20% chance of various errors (flaky payment gateway)
// Process payment for an order. Fails ~20% of the time simulating payment gateway issues.
query "payments/process" verb=POST {
  api_group = "Store"
  auth = "user"

  input {
    int order_id
    text payment_method?="credit_card"
  }

  stack {
    // Random number generation
    security.random_number {
      min = 1
      max = 10
    } as $roll
  
    // ~10% chance: gateway timeout
    precondition ($roll != 1) {
      error = "Payment gateway timeout: the payment provider did not respond within 30s"
    }
  
    // ~10% chance: payment declined
    precondition ($roll != 2) {
      error_type = "accessdenied"
      error = "Payment declined: insufficient funds or card expired"
    }
  
    db.get order {
      field_name = "id"
      field_value = $input.order_id
    } as $order
  
    precondition ($order != null) {
      error_type = "notfound"
      error = "Order not found"
    }
  
    precondition ($order.user_id == $auth.id) {
      error_type = "accessdenied"
      error = "You do not have access to this order"
    }
  
    // Simulate payment processing delay
    util.sleep {
      value = 0.5
    }
  
    db.edit order {
      field_name = "id"
      field_value = $order.id
      data = {status: "confirmed"}
    } as $updated_order
  }

  response = {status: "success", order: $updated_order}
}
---
// List all products - ~10% chance of 500 "database timeout"
// List available products. Randomly fails ~10% of the time to simulate database timeouts.
query products verb=GET {
  api_group = "Store"

  input {
    int page?=1
    int per_page?=25
  }

  stack {
    // Random number generation
    security.random_number {
      min = 1
      max = 10
    } as $roll
  
    precondition ($roll > 1) {
      error = "Database connection timeout while fetching products"
    }
  
    db.query product {
      sort = {product.created_at: "desc"}
      return = {
        type  : "list"
        paging: {page: $input.page, per_page: $input.per_page}
      }
    } as $products
  }

  response = $products
}
---
// Get a single product by ID - ~10% chance of 404 "not found"
// Get product by ID. Randomly fails ~10% of the time to simulate missing records.
query "products/{product_id}" verb=GET {
  api_group = "Store"

  input {
    int product_id
  }

  stack {
    // Random number generation
    security.random_number {
      min = 1
      max = 10
    } as $roll
  
    precondition ($roll > 1) {
      error_type = "notfound"
      error = "Product not found: the requested product does not exist or has been removed"
    }
  
    conditional {
      if ($roll == 2) {
        util.sleep {
          value = 2
        }
      
        db.query product {
          where = $db.my_name == 2
          return = {type: "list"}
        } as $product1
      }
    }
  
    conditional {
      if ($roll == 3) {
        while (true) {
          each {
            var $x1 {
              value = 1
            }
          }
        }
      }
    }
  
    db.get product {
      field_name = "id"
      field_value = $input.product_id
    } as $product
  
    precondition ($product != null) {
      error_type = "notfound"
      error = "Product not found"
    }
  }

  response = $product
}
---
// Seed the database with sample products and orders
// Populate product and order tables with sample data for testing.
query seed verb=POST {
  api_group = "Store"

  input {
  }

  stack {
    // Clear existing data
    db.truncate product
  
    db.truncate order
  
    // Seed products
    db.add product {
      data = {
        name        : "Wireless Headphones"
        description : "Noise-cancelling over-ear headphones"
        price       : 149.99
        stock       : 45
        category    : "electronics"
        is_available: true
      }
    } as $p1
  
    db.add product {
      data = {
        name        : "USB-C Cable"
        description : "2m braided charging cable"
        price       : 12.99
        stock       : 200
        category    : "electronics"
        is_available: true
      }
    } as $p2
  
    db.add product {
      data = {
        name        : "Standing Desk"
        description : "Adjustable height standing desk"
        price       : 499
        stock       : 8
        category    : "furniture"
        is_available: true
      }
    } as $p3
  
    db.add product {
      data = {
        name        : "Mechanical Keyboard"
        description : "Cherry MX Brown switches"
        price       : 89.99
        stock       : 32
        category    : "electronics"
        is_available: true
      }
    } as $p4
  
    db.add product {
      data = {
        name        : "Desk Lamp"
        description : "LED desk lamp with dimmer"
        price       : 34.5
        stock       : 0
        category    : "furniture"
        is_available: false
      }
    } as $p5
  
    db.add product {
      data = {
        name        : "Monitor Arm"
        description : "Single monitor mount, VESA compatible"
        price       : 79
        stock       : 15
        category    : "furniture"
        is_available: true
      }
    } as $p6
  
    db.add product {
      data = {
        name        : "Webcam HD"
        description : "1080p webcam with microphone"
        price       : 59.99
        stock       : 3
        category    : "electronics"
        is_available: true
      }
    } as $p7
  
    db.add product {
      data = {
        name        : "Mouse Pad XL"
        description : "Extended gaming mouse pad"
        price       : 19.99
        stock       : 120
        category    : "accessories"
        is_available: true
      }
    } as $p8
  
    db.add product {
      data = {
        name        : "Laptop Stand"
        description : "Aluminum laptop riser"
        price       : 45
        stock       : 0
        category    : "accessories"
        is_available: false
      }
    } as $p9
  
    db.add product {
      data = {
        name        : "Cable Management Kit"
        description : "Under-desk cable organizer"
        price       : 24.99
        stock       : 67
        category    : "accessories"
        is_available: true
      }
    } as $p10
  
    // Seed some orders (using user_id = 1, assuming a user exists)
    db.add order {
      data = {
        user_id: 1
        total  : 149.99
        status : "delivered"
        notes  : "Gift wrapping requested"
      }
    } as $o1
  
    db.add order {
      data = {
        user_id: 1
        total  : 588.99
        status : "processing"
        notes  : "Express shipping"
      }
    } as $o2
  
    db.add order {
      data = {user_id: 1, total: 12.99, status: "pending"}
    } as $o3
  
    db.add order {
      data = {user_id: 1, total: 79, status: "shipped"}
    } as $o4
  
    db.add order {
      data = {
        user_id: 1
        total  : 249.98
        status : "cancelled"
        notes  : "Customer changed mind"
      }
    } as $o5
  
    db.add order {
      data = {
        user_id: 1
        total  : 34.5
        status : "refunded"
        notes  : "Item was defective"
      }
    } as $o6
  }

  response = {products_created: 10, orders_created: 6}
}
---
// Get shipping estimate - calls calculate_shipping function
// Get a shipping cost estimate using the shipping calculation function.
query "shipping/estimate" verb=GET {
  api_group = "Store"

  input {
    decimal order_total
    text destination?=domestic
  }

  stack {
    function.run calculate_shipping {
      input = {
        order_total: $input.order_total
        destination: $input.destination
      }
    } as $estimate
  }

  response = $estimate
}
---
// Generate daily reports - runs every 5 minutes, ~15% failure rate
// Generates analytics reports. Fails ~15% to simulate aggregation timeouts.
task generate_reports {
  stack {
    // generate number
    security.random_number {
      min = 1
      max = 20
    } as $roll
  
    // ~10% chance: aggregation timeout
    precondition ($roll > 2) {
      error = "Report generation failed: aggregation query exceeded 30s timeout on orders table"
    }
  
    // ~5% chance: disk space
    precondition ($roll != 3) {
      error = "Report generation failed: insufficient disk space to write report output"
    }
  
    db.query order {
      return = {type: "count"}
    } as $order_count
  
    db.query product {
      return = {type: "count"}
    } as $product_count
  
    debug.log {
      value = "Report generated: " ~ ($order_count|to_text) ~ " orders, " ~ ($product_count|to_text) ~ " products"
    }
  }

  schedule = [{starts_on: 2026-03-26 00:00:00+0000, freq: 300}]
}
---
// Process pending refunds - runs every 2 minutes, ~10% failure rate
// Processes pending order refunds. Fails ~10% to simulate payment provider errors.
task process_refunds {
  stack {
    // generate number
    security.random_number {
      min = 1
      max = 10
    } as $roll
  
    precondition ($roll > 1) {
      error = "Refund processing error: payment provider returned invalid response (ERR_TIMEOUT_42)"
    }
  
    db.query order {
      where = $db.order.status == "refunded"
      return = {type: "list"}
    } as $refund_orders
  
    debug.log {
      value = "Refund processing completed: " ~ ($refund_orders|count|to_text) ~ " refunds processed"
    }
  }

  schedule = [{starts_on: 2026-03-26 00:00:00+0000, freq: 120}]
}
---
// Sync inventory with external warehouse - runs every minute, ~10% failure rate
// Syncs product inventory with external warehouse system. Fails ~10% to simulate sync errors.
task sync_inventory {
  stack {
    // generate number
    security.random_number {
      min = 1
      max = 10
    } as $roll
  
    precondition ($roll > 1) {
      error = "Inventory sync failed: external warehouse API returned HTTP 503 Service Unavailable"
    }
  
    // Simulate sync work
    util.sleep {
      value = 0.2
    }
  
    db.query product {
      where = $db.product.is_available == true
      return = {type: "list"}
    } as $products
  
    debug.log {
      value = "Inventory sync completed successfully for " ~ ($products|count|to_text) ~ " products"
    }
  }

  schedule = [{starts_on: 2026-03-26 00:00:00+0000, freq: 60}]
}
---
// Send shipping updates - runs every 3 minutes, calls calculate_shipping and process_notification
// Calculates shipping for shipped orders and notifies customers. Calls calculate_shipping and process_notification functions.
task send_shipping_updates {
  stack {
    // generate number
    db.query order {
      where = $db.order.status == "shipped"
      return = {type: "list"}
    } as $shipped_orders
  
    foreach ($shipped_orders) {
      each as $order {
        function.run calculate_shipping {
          input = {order_total: $order.total, destination: "domestic"}
        } as $shipping
      
        function.run process_notification {
          input = {
            user_id: $order.user_id
            message: "Your order #" ~ ($order.id|to_text) ~ " is on its way!"
            channel: "email"
          }
        } as $notif
      
        debug.log {
          value = "Shipping update sent for order " ~ ($order.id|to_text)
        }
      }
    }
  }

  schedule = [{starts_on: 2026-03-26 00:00:00+0000, freq: 180}]
}
---
// Validate all pending orders - runs every 2 minutes, calls validate_order function
// Iterates pending orders and validates each one via the validate_order function.
task validate_pending_orders {
  stack {
    // generate number
    db.query order {
      where = $db.order.status == "pending"
      return = {type: "list"}
    } as $pending_orders
  
    foreach ($pending_orders) {
      each as $order {
        function.run validate_order {
          input = {order_id: $order.id}
        } as $validation
      
        debug.log {
          value = "Validated order " ~ ($order.id|to_text) ~ ": " ~ ($validation.valid|to_text)
        }
      }
    }
  }

  schedule = [{starts_on: 2026-03-26 00:00:00+0000, freq: 20}]
}