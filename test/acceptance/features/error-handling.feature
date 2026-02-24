Feature: Error handling

  Scenario: Unknown command shows error
    When I run "squad nonexistent-command"
    Then the output contains "Unknown command"
    And the exit code is 1

  Scenario: Import without file shows error
    When I run "squad import"
    Then the output contains "squad import"
    And the exit code is 1
