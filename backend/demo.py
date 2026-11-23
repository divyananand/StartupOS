"""Sample data for demo workspaces.

Each "Try the demo" click gets its own throwaway account seeded with this
data, so visitors can explore without signing up and never see each other's
changes. Demo accounts (and everything in them) are deleted after 24 hours.
"""

from datetime import date, timedelta

DEMO_TTL_HOURS = 24


def _d(days: int) -> str:
    return (date.today() + timedelta(days=days)).isoformat()


def seed_demo_workspace(cur, user_id: int) -> None:
    tasks = [
        ("Finish onboarding flow redesign", "in-progress", "Priya", "high", _d(3)),
        ("Write investor update email", "todo", "Sam", "high", _d(2)),
        ("Set up Stripe billing", "todo", "Arjun", "medium", _d(10)),
        ("Prepare beta launch checklist", "todo", "Sam", "low", _d(12)),
        ("Interview 5 beta users about onboarding", "todo", "Priya", "medium", _d(6)),
        ("Migrate analytics to PostHog", "done", "Arjun", "low", _d(-2)),
        ("Draft beta waitlist email", "done", "Priya", "medium", _d(-4)),
    ]
    for title, status, owner, priority, deadline in tasks:
        cur.execute(
            "INSERT INTO tasks (title, status, owner, priority, deadline, date, user_id) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (title, status, owner, priority, deadline, deadline, user_id),
        )

    blockers = [
        ("Waiting on legal to approve the privacy policy", "open"),
        ("AWS credits run out in 2 weeks and the startup program hasn't replied", "open"),
        ("Design tokens missing from the Figma file", "resolved"),
    ]
    for title, status in blockers:
        cur.execute(
            "INSERT INTO blockers (title, description, status, user_id) VALUES (%s, %s, %s, %s)",
            (title, title, status, user_id),
        )

    decisions = [
        "Launch the beta with 50 users instead of 200",
        "Move standups to Tuesday and Thursday only",
        "Use Stripe for billing instead of building invoicing in-house",
    ]
    for title in decisions:
        cur.execute("INSERT INTO decisions (title, description, user_id) VALUES (%s, %s, %s)", (title, title, user_id))

    documents = [
        (
            "Seed round pitch — summary",
            "pitch-deck",
            "Problem: early-stage teams lose track of what was decided in meetings.\n"
            "Solution: StartupOS turns meeting notes into tasks, blockers and decisions automatically.\n"
            "Traction: 50-user private beta launching this month.\n"
            "Ask: $1.2M seed to reach 1,000 paying teams.",
        ),
        (
            "Release checklist",
            "sop",
            "1. All tests pass on main\n2. Tag the release\n3. Deploy backend, then frontend\n"
            "4. Smoke-test sign-up, extract and reports\n5. Announce in #launches",
        ),
    ]
    for title, doc_type, content in documents:
        cur.execute(
            "INSERT INTO documents (title, doc_type, content, user_id) VALUES (%s, %s, %s, %s)",
            (title, doc_type, content, user_id),
        )

    report = """## Progress This Week
- **Analytics migrated to PostHog** (Arjun), unblocking funnel tracking for the beta.
- **Beta waitlist email drafted** (Priya) and ready to send.
- Onboarding redesign is **in progress** and on track for this week.

## Open Blockers
- **Privacy policy approval from legal**: the beta can't launch until it's signed off.
- **AWS credits expire in 2 weeks**: follow up with the startup program or budget for hosting.

## Important Decisions
- Beta will launch with **50 users** instead of 200 to keep feedback manageable.
- Standups move to **Tuesday and Thursday**.
- **Stripe** chosen for billing.

## Next Week Priorities
1. Ship the onboarding redesign (Priya, high).
2. Send the investor update (Sam, high).
3. Chase legal on the privacy policy so the beta date holds.
4. Start Stripe billing setup (Arjun)."""
    cur.execute(
        "INSERT INTO reports (title, content, user_id) VALUES (%s, %s, %s)",
        ("Weekly Report (sample)", report, user_id),
    )
