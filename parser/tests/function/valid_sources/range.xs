function range {
  input {
  }

  stack {
    var $x1 {
      value = 1..10
    }
    var $x2 {
      value = (1..10)|sum
    }
  }

  response = $x1
}
