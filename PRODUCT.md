# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who want to stay intentional about friendships and other close relationships without being judged by a score or pushed into constant app use.

## Product Purpose

Drift helps a person remember and follow through on check-ins they choose for people they care about. Success means users find reminders useful, return voluntarily, and reconnect on their own terms during a 30-day validation period.

## Positioning

Drift is a manual-first relationship reminder layer inside AuraSync. Users decide whom to add, their usual rhythm, and whether or when to be reminded. It supports follow-through rather than measuring another person's interest or predicting a relationship's future.

## Operating Context

Drift is a separate mode in the existing AuraSync web application. A first-time user can try it without connecting a messaging account or creating a Drift-specific account. The current MVP stores manually entered data in the user's browser.

## Capabilities and Constraints

- Add, edit, pause, and remove a relationship.
- Record a user-reported cadence and last meaningful connection.
- Set an optional, user-chosen reminder date; allow marking a reminder done or snoozing it. Repeating reminders are opt-in and use the cadence the user selected.
- Keep private local notes, small personal tasks, and shared plans beside each chosen relationship.
- Enable browser notifications only after explicit permission; they are checked while Drift is open. Calendar events are a user-triggered alternative.
- Import an explicitly selected CSV template or JSON backup, with parsing in the browser; provide a manual check-in log and a clear explanation of reminder timing.
- Export and delete locally stored Drift data.
- No address-book import, message access, OAuth integration, automated inference, relationship score, or notification by default.
- Existing AuraSync deal-intelligence routes and workflows remain unchanged.
- App Store distribution is not in scope for this web target.
- Cross-device account sync and server-side analytics remain open decisions, requiring a separate privacy and consent design.

## Brand Commitments

The product is named Drift. Its voice should be calm, direct, and non-judgmental. Users remain in control of who is tracked and when they are reminded.

## Evidence on Hand

The repository contains the existing AuraSync web application and UI system. The supplied Drift onboarding brief describes a manual-first zero-data path; its scoring, OAuth, and sharing ideas are superseded for this validation MVP by the user's decision to test gentle, user-chosen reminders.

## Product Principles

- Show usefulness before asking for access or account creation.
- Treat relationship context as sensitive and minimize collection.
- Keep reminders user-authored, optional, and easy to dismiss.
- Do not use scores, manufactured urgency, streaks, or anxiety to drive engagement.
- Make storage and data removal understandable and under user control.
