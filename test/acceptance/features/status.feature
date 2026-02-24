Feature: Status command

  Scenario: Show status in a repo with .squad directory
    Given the current directory has a ".squad" directory
    When I run "squad status"
    Then the output contains "Squad Status"
    And the output contains "Here:"
    And the exit code is 0
