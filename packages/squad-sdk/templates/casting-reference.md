# Casting Reference

> **Loading context:** This file is read on-demand during Init Mode or when adding new team members. It contains the full universe table, selection algorithm, and casting state file schemas.

## Universe Table

The casting system includes **14 universes** with varying capacities (6–25 characters).

| # | Universe | Capacity | Shape | Resonance |
|---|----------|----------|-------|-----------|
| 1 | The Usual Suspects | 6 | heist-noir | tension, paranoia, deduction |
| 2 | Reservoir Dogs | 8 | heist-noir | pressure, distrust, loyalty |
| 3 | Alien | 8 | sci-fi-survival | isolation, resourcefulness, threat |
| 4 | Ocean's Eleven | 14 | heist-ensemble | precision, charm, coordination |
| 5 | Arrested Development | 15 | comedy-ensemble | chaos, incompetence, ambition |
| 6 | Star Wars | 12 | space-opera | destiny, conflict, mentorship |
| 7 | The Matrix | 10 | cyberpunk | reality, rebellion, awakening |
| 8 | Firefly | 10 | space-western | independence, loyalty, survival |
| 9 | The Goonies | 8 | adventure | discovery, teamwork, courage |
| 10 | The Simpsons | 20 | comedy-ensemble | absurdity, community, persistence |
| 11 | Breaking Bad | 12 | crime-drama | transformation, consequence, ambition |
| 12 | Lost | 18 | mystery-ensemble | mystery, leadership, survival |
| 13 | Marvel Cinematic Universe | 25 | superhero-ensemble | responsibility, teamwork, sacrifice |
| 14 | DC Universe | 18 | superhero-ensemble | justice, duality, legacy |

### Column Definitions

- **Capacity:** Maximum number of unique character names available in this universe.
- **Shape:** Genre/tone archetype. Used for `shape_fit` scoring.
- **Resonance:** Thematic keywords. Used for `resonance_fit` scoring during selection.

## Universe Selection Algorithm

Selection is **deterministic**: the same inputs always produce the same choice (unless LRU history changes).

### Scoring

For each candidate universe, compute:

```
score = size_fit + shape_fit + resonance_fit + lru_bonus
```

| Factor | Weight | Description |
|--------|--------|-------------|
| `size_fit` | 40% | How well the universe capacity matches the requested team size. Exact match = 1.0, overcapacity penalized linearly. |
| `shape_fit` | 25% | Match between the project's detected genre/tone and the universe shape. |
| `resonance_fit` | 20% | Overlap between project keywords and universe resonance themes. |
| `lru_bonus` | 15% | Least-recently-used bonus. Universes not used in recent assignments score higher. |

### Selection Steps

1. Filter universes where `capacity >= agent_count`.
2. Score each remaining universe using the formula above.
3. Select the highest-scoring universe.
4. On tie, prefer the universe with the lower index (stable sort).

## Casting State File Schemas

The casting system maintains state in `.squad/casting/` with three files.

### `policy.json`

Configuration file that controls universe selection behavior.

```json
{
  "casting_policy_version": "1.1",
  "allowlist_universes": [
    "The Usual Suspects",
    "Reservoir Dogs",
    "..."
  ],
  "universe_capacity": {
    "The Usual Suspects": 6,
    "Reservoir Dogs": 8,
    "..."
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `casting_policy_version` | string | Schema version (current: `"1.1"`). |
| `allowlist_universes` | string[] | Ordered list of allowed universe names. |
| `universe_capacity` | object | Map of universe name → max character count. |

### `registry.json`

Persistent name registry tracking all assigned agent names.

```json
{
  "universe": "The Matrix",
  "agents": {
    "Morpheus": { "role": "Lead", "assigned_at": "2025-01-15T10:00:00Z", "legacy_named": false },
    "Trinity": { "role": "Core Dev", "assigned_at": "2025-01-15T10:00:00Z", "legacy_named": false }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `universe` | string | The universe assigned to this squad. |
| `agents` | object | Map of character name → assignment metadata. |
| `agents[name].role` | string | The agent's squad role. |
| `agents[name].assigned_at` | string | ISO 8601 timestamp of assignment. |
| `agents[name].legacy_named` | boolean | `true` if the agent predates the casting system (never rename). |

### `history.json`

Universe usage history for LRU scoring and audit trail.

```json
{
  "assignments": [
    {
      "universe": "The Matrix",
      "repo": "owner/repo",
      "agent_count": 5,
      "assigned_at": "2025-01-15T10:00:00Z",
      "score": { "size_fit": 0.85, "shape_fit": 0.70, "resonance_fit": 0.60, "lru_bonus": 1.0 }
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `assignments` | array | Ordered list of past universe assignments (most recent last). |
| `assignments[].universe` | string | Universe name selected. |
| `assignments[].repo` | string | Repository the assignment was made for. |
| `assignments[].agent_count` | number | Number of agents in the squad at assignment time. |
| `assignments[].assigned_at` | string | ISO 8601 timestamp. |
| `assignments[].score` | object | Breakdown of the selection score factors. |
