Feature: Extract command

  Scenario: Help text shows extract command
    When I run "squad help"
    Then the output contains "extract"
    And the output contains "Extract learnings from consult mode session"
    And the exit code is 0

  Scenario: Extract outside consult mode fails
    Given a directory without a ".squad" directory
    When I run "squad extract" in the temp directory
    Then the output contains "No .squad/config.json found"
    And the exit code is 1

  Scenario: Extract --dry-run option exists
    When I run "squad help"
    Then the output contains "extract"
    And the output contains "--dry-run"
    And the exit code is 0
