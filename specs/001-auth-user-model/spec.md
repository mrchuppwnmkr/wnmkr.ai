# Feature Specification: Authentication, User Model & Role Gating

**Feature Branch**: `phase1-auth`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "Phase 1 build — authentication plus the user/role model. Sign up, sign in, password reset; the six-role user model (anonymous, registered, three subscriber tiers, founder, admin); server-enforced access gating for subscriber-only and admin-only areas; and an admin screen where Mike assigns the Founder comp role."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create an account and sign in (Priority: P1)

A visitor to wnmkr.ai decides they want an account. They sign up with an email address and a
password, confirm their email, and land back on the site signed in. On a later visit they sign in
with the same credentials. If they have forgotten the password, they request a reset link by email
and set a new one.

**Why this priority**: Nothing else in Phase 1 can exist without identity. The consultant quota,
the Oak Calculator, the Founder comp path, and the admin panel all key off a signed-in user.

**Independent Test**: Fully testable on its own — a person with no prior account can register,
verify, sign out, sign back in, reset a forgotten password, and reach a page that greets them by
name. Delivers a working account system even if no gated content exists yet.

**Acceptance Scenarios**:

1. **Given** a visitor with no account, **When** they submit a valid email and a password meeting
   the strength policy on the sign-up screen, **Then** an account is created, a verification email
   is sent, and they are told to check their inbox.
2. **Given** a newly created unverified account, **When** the person clicks the verification link,
   **Then** the account is marked verified and they are signed in and returned to the site.
3. **Given** a verified account, **When** the person submits correct credentials on the sign-in
   screen, **Then** they are signed in and returned to the page they originally requested, or to
   the home page if they navigated to sign-in directly.
4. **Given** a verified account, **When** the person submits an incorrect password, **Then** they
   see an error that does not disclose whether the email address is registered.
5. **Given** a person who has forgotten their password, **When** they request a reset for a
   registered email, **Then** a time-limited reset link is emailed and the confirmation message is
   identical whether or not that email is registered.
6. **Given** a valid unexpired reset link, **When** the person sets a new password meeting the
   strength policy, **Then** the password is changed, all other active sessions are terminated,
   and they are signed in.
7. **Given** a signed-in person, **When** they sign out, **Then** their session ends and revisiting
   a gated page requires signing in again.

---

### User Story 2 - Access matches entitlement (Priority: P1)

The site has free areas, subscriber-only areas, and an admin-only area. Whatever a person's
entitlement is, the site consistently shows them what they are allowed to see, refuses what they
are not, and tells them how to get access rather than showing a dead end.

**Why this priority**: The paid tiers only mean something if the gate holds. A subscriber-only
tool reachable by anyone with the URL destroys the subscription product on day one.

**Independent Test**: Testable by walking the same set of URLs as each role and confirming the
outcome each time — including by direct URL entry and by page refresh, not only by clicking
through the navigation.

**Acceptance Scenarios**:

1. **Given** a person who is not signed in, **When** they request a subscriber-only page,
   **Then** they are sent to sign-in, and after signing in they arrive at the page they originally
   requested if entitled.
2. **Given** a signed-in person with no subscription, **When** they request a subscriber-only page,
   **Then** they see an upgrade prompt explaining what the subscription includes, not a generic
   error and not the gated content.
3. **Given** a person entitled to a subscriber tier, **When** they request a subscriber-only page,
   **Then** the page renders in full.
4. **Given** any non-admin person, **When** they request any admin page or admin data operation,
   **Then** the request is refused and the existence of admin functionality is not disclosed.
5. **Given** a person whose entitlement is changed while they are signed in, **When** they next
   request a page whose access depends on that entitlement, **Then** the new entitlement applies
   without requiring them to sign out and back in.
6. **Given** any gated data operation, **When** it is requested directly rather than through the
   site's own screens, **Then** it is refused on the server using the same rules as the page.

---

### User Story 3 - Grant a Founder comp account (Priority: P2)

Mike is onboarding one or two Founders — early users who get full access at no charge. He opens
the admin user list, finds the person by email, grants them the Founder role, and optionally sets
which tier of access they get. The change takes effect for that person on their next page request.
Later he can revoke it.

**Why this priority**: This is how Phase 1 actually reaches its first users, since payment is not
in this slice. It depends on Stories 1 and 2 existing, so it follows them.

**Independent Test**: Testable end to end by creating a second ordinary account, granting it
Founder from the admin screen, confirming subscriber-only pages open for that account, then
revoking and confirming they close again.

**Acceptance Scenarios**:

1. **Given** Mike is signed in as the admin, **When** he opens the admin user list, **Then** he
   sees registered people with their email, role, entitlement tier, and sign-up date, and can find
   a person by searching their email.
2. **Given** a registered person with no entitlement, **When** Mike grants them the Founder role,
   **Then** their entitlement becomes the top tier by default, no charge is associated, and the
   change is recorded with who made it and when.
3. **Given** Mike is granting Founder, **When** he chooses a specific tier instead of the default,
   **Then** that tier is what the person receives.
4. **Given** a person holding the Founder role, **When** Mike revokes it, **Then** their access
   returns to what their own subscription entitles them to, which for an unsubscribed person is
   free-tier access.
5. **Given** Mike is viewing the admin user list, **When** he attempts to change his own admin
   role, **Then** the action is refused so the site cannot be left without an administrator.

---

### Edge Cases

- A person signs up with an email that already has an account: the response is the same as a
  successful sign-up and an explanatory email goes to the existing address, so account existence
  is never revealed through the sign-up form.
- A verification or reset link is used twice, or after it expires: the person is told the link is
  no longer valid and offered a fresh one.
- A person is signed in on two devices and changes their password on one: sessions elsewhere end.
- The identity provider is unreachable: gated pages fail closed — access is refused rather than
  granted — and the person sees a service-unavailable message rather than a blank page.
- A person exists with the identity provider but has no corresponding application record yet (for
  example the record was never created, or was removed): the record is created on their next
  request with free-tier entitlement rather than erroring.
- Two admin changes to the same person's role arrive at once: the later write wins and both are
  recorded in the audit trail.
- A person deletes their account at the identity provider: their application record is retained in
  a deactivated state so audit history is not orphaned.
- Role is changed for a person who is mid-session on a gated page: the next request re-evaluates,
  and if they are no longer entitled they see the upgrade prompt rather than stale content.

## Requirements *(mandatory)*

### Functional Requirements

**Accounts and sessions**

- **FR-001**: System MUST allow a visitor to create an account with an email address and a
  password, and MUST require the email address to be verified before the account is treated as
  fully registered.
- **FR-002**: System MUST enforce a documented password strength policy at sign-up and at password
  reset, and MUST reject passwords known to be compromised.
- **FR-003**: Users MUST be able to sign in, sign out, and reset a forgotten password by email
  using a single-use, time-limited link.
- **FR-004**: System MUST NOT disclose whether an email address is registered through any
  sign-up, sign-in, or password-reset response.
- **FR-005**: System MUST terminate all other active sessions for a user when that user's password
  is changed or reset.
- **FR-006**: System MUST return a person to the page they originally requested after they sign in
  from a gate, provided they are entitled to it.

**User records and roles**

- **FR-007**: System MUST maintain exactly one application record per identity, created no later
  than that person's first authenticated request, holding at minimum the identity reference, email,
  role, entitlement tier, entitlement source, and creation and update times.
- **FR-008**: System MUST support exactly this role set: anonymous, registered, vintner,
  winemaker, cellar master, founder, admin. Any identity without an application record is treated
  as registered with free-tier entitlement; any unauthenticated request is treated as anonymous.
- **FR-009**: System MUST record, for each entitled person, whether their entitlement comes from a
  paid subscription or from a Founder grant, so that billing can be reconciled later.
- **FR-010**: System MUST treat the Founder role as conferring top-tier entitlement by default
  while carrying no charge, and MUST allow an administrator to set a different tier for an
  individual Founder.
- **FR-011**: System MUST designate exactly one account as the administrator by configuration
  rather than by a value any user can set, and MUST NOT provide any in-product path for a
  non-administrator to obtain the administrator role.

**Access control**

- **FR-012**: System MUST enforce every access rule on the server for both page requests and data
  operations. Client-side hiding of navigation or controls MUST NOT be the only control.
- **FR-013**: System MUST deny access to any resource whose required entitlement is not explicitly
  declared, rather than defaulting to allow.
- **FR-014**: System MUST re-evaluate a person's entitlement on each request, so that a role change
  takes effect without the person signing out and back in.
- **FR-015**: System MUST show a person refused for insufficient entitlement an explanation of what
  access they would need and how to get it, while showing a person refused from administrator
  functionality a response that does not reveal that the functionality exists.
- **FR-016**: System MUST fail closed if entitlement cannot be determined for any reason.

**Administration**

- **FR-017**: Administrators MUST be able to list registered people with their email, role,
  entitlement tier, entitlement source, and sign-up date, and to find a person by email.
- **FR-018**: Administrators MUST be able to grant and revoke the Founder role and set the
  entitlement tier that accompanies it.
- **FR-019**: System MUST record every role or entitlement change with the person changed, the
  administrator who made the change, the previous and new values, and the time, and MUST retain
  that record after the change is superseded.
- **FR-020**: System MUST prevent an administrator from removing their own administrator role, so
  the site cannot be left with no administrator.
- **FR-021**: Revoking the Founder role MUST return the person to whatever entitlement their own
  subscription confers, which is free-tier access when they have none.

### Key Entities

- **User**: A person with an account. Holds the reference to their identity at the identity
  provider, their email, their role, their entitlement tier, the source of that entitlement
  (subscription or Founder grant), whether the account is active, and creation and update times.
  One user corresponds to exactly one identity.
- **Role**: The named access level a user holds — registered, one of the three subscriber tiers,
  founder, or admin. Determines what the user may reach. Anonymous is the absence of a user rather
  than a stored value.
- **Entitlement Tier**: The level of product access granted — free, vintner, winemaker, or cellar
  master. Normally derived from the role, but stored separately so a Founder grant can set it
  independently of how the person pays.
- **Role Change Record**: An immutable entry describing one change to a user's role or entitlement
  — who was changed, who changed it, from what, to what, and when. Retained for audit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new visitor can go from the landing page to a verified, signed-in account in under
  two minutes without assistance.
- **SC-002**: 100% of attempts to reach subscriber-only or admin-only resources without the
  required entitlement are refused, including attempts made by direct URL and by calling the data
  operation directly rather than using the site's screens.
- **SC-003**: A role change made by the administrator takes effect for the affected person on their
  next page request, with no sign-out required.
- **SC-004**: Mike can grant Founder access to a named person, and confirm it worked, in under one
  minute from opening the admin user list.
- **SC-005**: Every role and entitlement change in the system is attributable to a specific
  administrator and a specific time, with no gaps.
- **SC-006**: No sign-up, sign-in, or password-reset response allows an outside party to determine
  whether a given email address has an account.
- **SC-007**: Gate decisions add no more than 100ms to a page request at the median.

## Assumptions

- Email and password is the sign-up method for Phase 1. Social sign-in and multi-factor
  authentication are deferred; the chosen identity provider supports adding them later without
  migrating accounts.
- Payment is out of scope for this slice. The only route to a paid entitlement tier in Phase 1 is
  an administrator granting Founder; the entitlement-source field exists so that subscription-driven
  entitlement can be added in the next slice without reworking the model.
- Exactly one administrator exists (Mike), designated by configuration. Multi-admin support,
  delegated admin roles, and an admin invitation flow are out of scope.
- The three subscriber tiers are modeled and gated in this slice, but only free and Founder-granted
  entitlement can actually be reached until payments land.
- The anonymous AI-consultant teaser counter is out of scope here. It is a client-side courtesy
  limit, not an entitlement, and is specified with the consultant feature.
- Transactional email — verification and password reset — is delivered by the identity provider's
  built-in email service in Phase 1; a custom sending domain is a later concern.
- The administrator's own account is created through the ordinary sign-up flow and then designated
  as administrator by configuration.
- Account deletion by the user, data export, and a self-service profile screen are out of scope for
  this slice.
