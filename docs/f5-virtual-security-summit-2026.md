# F5 Virtual Security Summit 2026 — "Security for the Post-Mythos World"

**Compiled 17 September 2026; rewritten as a technical record 18 September 2026.**

The summit's on-demand library goes offline on **30 October 2026**. This document exists so the
material outlives it. It began as a record reconstructed from the nine summit emails in the
`ibrahim.ghazi@innovativeintegration.net` mailbox, and was then extended from the ON24 console
itself — abstracts, runtimes, speaker records, resource lists and the English caption tracks of
all eight sessions.

**What this document is.** An explanation of the material, organised by subject. It is not a
transcript and not a per-speaker account of who said what when. Where a claim's weight depends on
who is making it — F5's own testing versus independent validation versus analyst survey data —
the source is named. Otherwise the ideas stand on their own. The
[session catalogue](#session-catalogue) maps every topic back to the video it came from, for as
long as the videos exist.

> **Reliability.** Six of the eight caption tracks are machine speech-recognition; only the
> keynote and *Securing AI in Production* are edited captions. Names and product terms arrive
> garbled and have been corrected where the meaning is unambiguous. Figures the recogniser may
> have misheard are marked *(as captioned)*. See [How this was captured](#how-this-was-captured).

---

## Deadline

| | |
|---|---|
| **On-demand access ends** | **30 October 2026** (treat as hard deadline) |
| Days remaining as of 18 Sep 2026 | 42 |
| Consequence | All session videos become unavailable. No archive or extension is offered. |

Four F5 sources give three different end dates:

| Source | Stated end |
|---|---|
| Awan Distribution partner invitation, and its one-pager `F5 Virtual Security Summit_10th Sept to 30th Oct.pdf` | 30 October 2026 |
| *F5 Partner Connect newsletter — September 2026* | 31 October |
| FAQ on `f5.com/virtual-security-summit-2026` (checked 18 Sep) | "September 10 – October 31, 2026" |
| ON24 console sign-in page (checked 18 Sep) | "replay is available until November 1, 2026 11:55 AM PST" |

The ON24 date is the platform's own setting and is probably the real cut-off. **Plan to 30
October anyway** — it is the earliest date F5 has published, and nothing guarantees the later
ones will be honoured.

---

## Event at a glance

| Field | Value |
|---|---|
| Full name | F5 Virtual Security Summit: Security for the Post-Mythos World (ON24 title: "F5 Security Summit: Security for the post-Mythos world") |
| Host | F5, Inc. (801 5th Ave, Seattle, WA 98104) |
| Format | Virtual, free, fully on-demand — no live attendance component |
| Platform | ON24 (event hub ID `5460330`; each session is a separate "simu-live" ON24 webcast) |
| Nominal premiere | 9 Sep 2026, 9:00 PM PST (= 10 Sep in Pakistan) — the only "live" moment was a scheduled replay |
| Opened | Thursday, 10 September 2026 |
| Closes | 30 October 2026 (see [Deadline](#deadline)) |
| Session length | Marketed as "20 minutes or less". Actual runtimes are 9–22 minutes; two sessions run over 20. |
| Total content | 8 sessions, 1 h 59 min 49 s |
| Registration page | `https://www.f5.com/virtual-security-summit-2026` |
| Registered under | `ibrahim.ghazi@innovativeintegration.net` (F5's mailings address the recipient as "Muhammad") |
| Invited via | Awan Distribution (F5 distributor), forwarded internally by Ahmer Ghazi |
| ON24 registrant count | 174 on the keynote webcast, as reported by the console on 18 Sep |

**Why this arrived looking like a meeting invite.** The email that most resembles a calendar
invitation is *"You're on the list! F5 Virtual Security Summit reminders"* (9 Sep), which carries
an **Add to Calendar** control. It is a launch-day reminder for an on-demand library, not a
meeting. No `.ics` was ever sent and no event exists in this account's Google Calendar.

---

## Access

The canonical, non-personalised entry point:

```
https://www.f5.com/virtual-security-summit-2026
```

The keynote plays there without signing in. The other seven sessions require the ON24 console,
whose sign-in asks only for the registered email address. The direct "Access on-demand sessions"
links are **personalised `buzz.f5.com` tracking URLs that encode the recipient's identity** and
are deliberately kept out of this repository. To retrieve one, open either message in Gmail:

| Message | Date | Gmail message ID |
|---|---|---|
| "You're in! Access your F5 Security Summit on-demand sessions" | 17 Sep 2026 | `1a0b005a522c7263` |
| "Your summit sessions are live. Get started." | 14 Sep 2026 | `1a09da4d790709ea` |

---

# The material

## 1. The patch window inverted

The whole summit rests on one measurement, and everything else is a response to it.

The **median enterprise patch cycle is about 20 days**, and has not moved in eight years. That
number is not incompetence. It is change control, regression testing, maintenance windows and
high-availability failover working exactly as designed.

The **time from vulnerability disclosure to exploitation is now about −7 days**. Negative.
Exploitation begins roughly a week *before* the vulnerability is published. The trend line that
produced it: 771 days in 2018, around 10 months by 2021, and negative by 2026 — attributed to
Mandiant's M-Trends 2026 data. Separate research presented as the "Zero Day Clock", built on
more than 3,500 CVE-to-exploit pairs, puts the 2018 window at over two years and traces the same
collapse.

Three consequences follow, and they are structural rather than tactical:

**CVE scanning cannot see the problem.** A scanner matches against published vulnerabilities. If
exploitation precedes publication, the scanner is looking for something that does not exist yet.
Vulnerability management built on "find the CVE, patch the CVE" has a blind spot that opens
*before* the CVE does.

**Shipping a patch is itself a disclosure.** Attackers diff vendor patches to locate the flaw,
then weaponise it faster than most enterprises can deploy the fix. The patch is a starting gun
for everyone who has not already applied it.

**The exposure window is now shorter than the approval chain.** If the gap between "attackers can
exploit this" and "we have deployed the fix" is measured in days and your change process is
measured in weeks, then only what is already decided, automated and rehearsed happens in time.
This is a speed problem. It is not a visibility problem, a framework problem or a headcount
problem, and it does not respond to the usual fixes for those.

### What Mythos was

Neither the emails nor the landing page define the term the event is named after. The keynote
does, in its first minute.

**Mythos is a frontier AI model.** In prerelease testing it surfaced thousands of working
zero-days across every major operating system and every major browser — including a 27-year-old
flaw in OpenBSD, an operating system chosen for the test precisely because of its security
record. The significant word is *working*: not candidate findings for triage, but functioning
exploits.

"Post-Mythos" therefore names a period, not a product: the point at which AI-driven discovery of
working exploits stopped being a projection and became demonstrated. The keynote's closing line
is the operative one — Mythos will not be the last model of its kind.

The capability is described as tiered, and the tiers matter because they set the timeline:

1. **Broadly available models** are already effective at reverse engineering, penetration testing
   and vulnerability research. This tier is in everyone's hands now.
2. **The frontier tier** — Mythos and "GPT cyber" — chains exploits across complex codebases and
   is access-restricted today. Restriction is temporary; capability diffuses downward.
3. **Open-source tooling**, with hundreds of new projects a week doing agent-backed red teaming
   and web vulnerability assessment.

Machine-speed offence will not stay with nation-state actors, because tier 3 is already
reconstructing tier 2 in public.

*Outside context, not stated in any session:* the details match **Anthropic's Claude Mythos
Preview**, announced 7 April 2026 alongside *Project Glasswing*, a restricted defensive-use
programme, and never publicly released. Reporting at the time cited thousands of zero-days across
every major OS and browser and a 27-year-old OpenBSD bug. See
[Help Net Security, 8 Apr 2026](https://www.helpnetsecurity.com/2026/04/08/anthropic-claude-mythos-preview-identify-vulnerabilities/)
and [Anthropic — Project Glasswing](https://www.anthropic.com/project/glasswing). F5 never names
the vendor. **This attribution is unverified — confirm it before repeating it to a customer.**

### Why signature matching stopped working

A signature encodes a known payload. AI-generated attacks vary their payloads and adapt to the
responses they get, so the thing a signature is looking for is never quite the thing that
arrives. Signature-based WAFs are therefore not merely behind; they are *structurally* behind, by
one iteration, permanently.

The alternative is to stop describing attacks and start describing the application: baseline what
normal behaviour looks like for this specific application, and treat deviation as hostile. That
catches attacks with no name yet, which is the only category that matters when exploitation
precedes disclosure.

### Where the defence has to live

Three races, and you lose two of them:

- The **find** race — attackers using frontier models will locate vulnerabilities before you do.
- The **fix** race — you cannot compress 20 days of change control into a negative window.
- The **runtime** race — this one is winnable, because it does not depend on knowing about the
  vulnerability in advance.

The formulation that captures it: the attacker chooses the vulnerability; you choose what your
traffic is permitted to do. Enforcement sits in the data path, scores every request, and acts as
a virtual patch. This moves runtime enforcement from best practice to precondition.

The architectural corollary is a single platform rather than four. Four capabilities — AI-powered
WAAP, bot defence, AI security and post-quantum readiness — belong in one data path, because four
consoles, four policy engines and four vendors become their own vulnerability at machine speed.
F5's product name for this is **ADSP** (Application Delivery and Security Platform). Discount the
marketing framing if you like; the underlying point about fragmentation and reaction time stands
on its own.

---

## 2. Application and API defence

### Intent scoring instead of pattern matching

The AI-powered WAF replaces a rule verdict with a **dynamic risk score**. A hybrid engine
combines signature matches, attack indicators, continuously retrained ML models, neural networks
and LLMs to assess what a request is *trying to do*, and the resulting score drives policy action
rather than a fixed rule.

The practical difference: a rule answers "does this match a known attack?" and a score answers
"how likely is this request to be hostile, given everything I know about this application?" Only
the second question can be answered about an attack nobody has catalogued.

### Virtual patching as a scheduling decision

This is the most operationally useful idea in the summit, and it is not really a security
technique — it is a way of decoupling two timelines that are usually welded together.

Ordinarily, *exposure* ends when the *fix* ships, so a 20-day patch cycle means 20 days of
exposure. Virtual patching separates them: the exploit is neutralised at the edge in minutes,
while the code fix proceeds through normal change control at its normal pace. The 20-day process
stays 20 days, and the exposure window closes on day zero.

The consequence worth internalising: no emergency releases, no weekend heroics, and no pressure
to short-circuit testing. The reason this matters is that emergency patching is itself a source
of outages — the cure regularly competes with the disease.

### The efficacy numbers, and who produced them

Treat these two groups differently.

**F5's own testing**, against live customer traffic:
- Detection accuracy 64% → 98%
- Out-of-the-box false positives 28% → 1%
- 14 zero-days caught in the field with no new signatures, one later tied to known APT activity

**Independent validation** — SecureIQLab Cloud WAAP CyberRisk Validation: 92.7% security efficacy,
94.7% operational efficiency, and 100% protection on advanced threat categories with zero false
positives. A separate open-source WAF benchmark is cited at 100% precision with zero false
positives *(as captioned; the test name is garbled and unverifiable from the transcript)*.

The false-positive figure is the one that actually governs outcomes, and the reasoning behind
that is worth stating plainly. Most WAFs run in monitor mode, because in blocking mode they break
legitimate traffic and someone gets paged. A WAF that only logs attacks is documentation, not
protection. So the point of driving false positives from 28% to 1% is not elegance — it is that
below some threshold, teams will actually turn blocking on. F5 calls this earning the right to
enforce. An independent corroboration from a financial-services AppSec leader, relayed by
Forrester, matched it: the main benefit of the AI-powered WAF was far fewer false positives,
which made its recommendations trustworthy enough to act on.

Adoption figure: about **15% of F5 WAF customers** enabled the new AI-powered detection within
two months of release.

### What the demo actually demonstrated

Worth separating from the pitch, because it shows the deployment model as much as the product.

F5 Distributed Cloud was placed as the public front door — HTTP load balancer, AI-powered WAF,
service policy engine, authoritative DNS — in front of an existing BIG-IP VE, which continued
handling load balancing and TLS for an intentionally vulnerable origin application. Onboarding
was a single DNS record change: nothing new deployed in the data centre, no application code
touched.

Two classes of attack, and the distinction between them is the instructive part:

**Three SQL injection variants** — authentication bypass, UNION-based data dump, and an
obfuscated evasion variant — all blocked in blocking mode. Conventional, and a signature engine
would likely catch the first two.

**A business-logic flaw** — a negative-amount transfer on a payment endpoint that credits the
attacker instead of debiting them. Every request is perfectly valid. There is no malformed input,
nothing to match, and no signature that could ever catch it, because nothing is wrong with the
request except its meaning. This was closed with a single positive-security service policy at the
edge: a rule stating what the field is *allowed* to contain.

That contrast is the real lesson. Negative security (block known-bad) cannot express "amounts
must be positive". Positive security (permit only known-good) can, and it is the only model that
handles logic flaws — which are precisely the flaws that AI-assisted attackers are good at
finding and that no CVE will ever be issued for.

### Scope and adjacent coverage

The stack covers what Gartner defines as core WAAP — DDoS, WAF, bot defence, API discovery and
security — plus AI guardrails. Three additions are worth noting because they close gaps teams
often miss:

- **Client-side defence** against JavaScript supply-chain attacks such as Magecart. This became a
  **PCI DSS 4.0 requirement** for anyone taking card payments, so it is a compliance obligation,
  not an option.
- **Mobile App Shield**, covering reverse engineering and device-side malware.
- **Native protection for MCP-based applications and APIs** — a recognition that agent-tool
  protocols are now a production attack surface.
- **API Security Local Edition** for fully air-gapped, regulated environments: complete WAAP
  capability with no external dependency. Sovereignty-driven, and directly relevant wherever
  regulators prohibit anything leaving the premises.

Underneath everything, shared telemetry feeds a data fabric that correlates across sessions —
which is what makes cross-request and cross-session detection possible at all.

---

## 3. Automated and agentic traffic

### Bot management became agent management

The old question was binary: human or automated? That question no longer separates good from bad.

Frontier-AI agents reason, plan and act. They navigate sites, interpret content, recover from
errors and complete multi-step transactions in ways that closely resemble a person. Meanwhile,
plenty of automation is *wanted*: AI search crawlers, shopping assistants and agents transacting
on behalf of real customers. And plenty of human-looking traffic is hostile — credential stuffing
looks human by construction.

So the useful question is not "is this automated?" but "is this a trusted agent acting for a real
customer, or an autonomous system committing fraud, account takeover, scraping or business-logic
abuse?"

### Why the existing tooling misses it

Two failure modes, each structural:

**Bot tools judge single requests.** Each request in an agentic attack looks clean in isolation.
The signal only exists across sessions and across devices, which a per-request verdict cannot see
by definition.

**Fraud systems analyse completed transactions.** They are accurate and they are too late — the
analysis happens after the money has moved.

Better point detection does not fix either. The gap is in decisioning, not detection.

### Trust decisioning

The approach: persistent **device identity**, behavioural context carried across sessions, and
real-time correlation of relationships between accounts. Friction then scales with risk — seamless
for trusted users and trusted agents, challenge or block as risk rises. This depends on telemetry
that resists reverse engineering, since an attacker who can forge the signal controls the verdict.

For legitimate agents there are emerging identity standards — **Web Bot Auth** and **Know Your
Agent** — natively integrated, so an agent can be allowed, challenged, monitored or blocked on
identity, behaviour and business context. The commercial framing is that AI-driven commerce can
be welcomed, governed and even monetised rather than merely repelled, which is a more realistic
posture than trying to keep agents out.

Supporting data: automation increased most at **checkout**, up **13.38% on mobile** *(as
captioned)* — the step where abuse converts directly into loss, and where per-request tooling is
blindest. A referenced deployment at a global financial-services organisation was framed around
deciding which automated interactions to trust, rather than blocking more bots.

---

## 4. Securing AI itself

### Four years of escalation

The trajectory explains why this is now a runtime problem rather than a governance one:

- **2023** — individual use: a copilot on a laptop.
- **2024** — internal chatbots and HR/IT assistants touching corporate data.
- **2025** — external, customer-facing generative applications on non-deterministic models.
- **2026** — agentic AI that browses, calls APIs, executes code and runs workflows, often with
  full autonomy.

Each stage adds risk without retiring the previous one. Adoption and autonomy rose while control
and visibility fell, and the two lines crossed around 2025 — meaning autonomy overtook the
ability to observe it. F5 Labs reports thousands of new techniques weekly.

### Two distinct surfaces

Conflating these is the common mistake; they need different controls.

**AI your workforce uses.** Third-party models and agents. Blocking fails as a strategy because
employees route around it, so the sequence is discover, align to policy, observe at runtime. This
was an acknowledged blind spot in F5's platform until the **SurePath AI** acquisition, now
**F5 Workforce AI Security**, which does shadow-AI discovery and **intent classification** —
identifying not just which tool was used but *what for*, distinguishing a marketing research
workflow from a UI-development agent operating inside support.

**AI you build.** Here behaviour itself is the attack surface: prompts, models, data, tools,
agents, actions. Two failure buckets that look identical from outside, and to a regulator:

- *Unintended* — unsafe output, data leakage, an agent invoking a tool it should not have.
- *Adversarial* — prompt injection, model extraction, poisoned knowledge bases, manipulated
  agents.

The customer experiencing the harm cannot tell which it was, so the distinction matters for
engineering and not at all for liability.

The control loop is continuous discovery of AI assets → testing, including red teaming → hardened
runtime protection. Agents add two further requirements: **non-human identity** and **agentic
endpoint protection**. Point products leave gaps between these stages.

### Why a gateway, and why the economics argument matters

The **AI Gateway** is positioned as the single point every AI request passes through, and it is
justified on three grounds — deliberately, only one of which is security:

- **Cost** — route each request to the appropriate model and see token spend.
- **Performance** — prompt optimisation and caching.
- **Productivity** — one integration, unified access to any model.

The reasoning behind that is the most transferable idea in the session: security that shows up as
a tax gets bypassed, and security that shows up as leverage gets adopted. A control point
justified on cost and developer velocity survives budget scrutiny and does not get routed around,
which a control point justified purely on risk often does not.

The surrounding platform provides shadow-AI visibility, **AI Red Team** for applications and
agents, **AI Guardrails** for sensitive-data controls, and the gateway. Enforcement runs inline at
any control point, **including third-party AI gateways** — no rip-and-replace — and deploys as
SaaS, self-hosted or fully air-gapped.

---

## 5. Post-quantum readiness

The summit promised three practical steps toward PQC readiness. Here they are, with the reasoning
that makes them actionable rather than aspirational.

### Step 1 — Scope it

Most PQC panic is misdirected. **Symmetric encryption is not the problem**: AES-256 protecting a
database is fine. The exposure is **asymmetric cryptography in network handshakes and
certificates on the wire**, especially over public networks. Narrowing to that is the single
biggest reduction in apparent scope.

Within that, prioritise by **cover time** — Mosca's theorem — meaning how long the data must stay
confidential. Card numbers that expire have low cover time. PII, health records and intellectual
property need 7–10 years. Working backwards from a Q-day estimate around 2030, anything with a
five-year cover time needed protection starting in 2025. Long-lived data should already be on PQC
today; it is late, not early.

**TLS 1.3 is the non-negotiable starting line**, because post-quantum key exchange cannot be
negotiated over TLS 1.2. Anything still on 1.2 has a hard ceiling and must be moved first —
that is a prerequisite, not a parallel workstream.

### Step 2 — Govern it

Separate **third-party dependencies** from **your own code**, and do not spend engineering hours
auditing vendor code you cannot change.

For vendors, make quantum readiness a **hard procurement gate** and demand a **cryptographic bill
of materials (CBOM)**, which is becoming the regulatory standard for inventorying cryptographic
assets. This converts an impossible audit problem into a contractual one — the right move, since
you have leverage at purchase and none afterwards.

Your engineers then focus exclusively on proprietary code, which is the only part you can
actually fix.

### Step 3 — Protect it

Build **crypto-agility**: the ability to swap algorithms without interrupting a running system.

The trap is rewriting applications one at a time to embed new algorithms. It crushes performance,
forces premature hardware refreshes, and has to be redone when standards move — and NIST guidance
is still evolving, so hard-coding today's algorithms into individual applications guarantees
repeating the work.

The alternative is to **centralise cryptographic handling at a full-proxy layer** in front of the
legacy estate. The proxy terminates hybrid PQC ciphers on both sides, so systems that will never
support PQC natively sit behind something that does. It also absorbs the considerable performance
cost of PQC handshakes in one place you can scale, instead of spreading it across every
application.

### Timelines and the case for acting now

**Q-day** is the day a quantum computer demonstrably decrypts production-grade cryptography
without the key. It does not break everything at once, but it converts every CISO into a
part-time crypto inventory manager. F5's estimate is **2029**, pulled forward by recent Harvard
quantum research.

The threat does not wait for Q-day, because **harvest now, decrypt later** is happening today:
traffic captured now is stored against the day it can be opened. That is why cover time, not
Q-day, sets your deadline.

Readiness is worse than headline numbers suggest. F5 Labs finds 54% of the top million websites
support PQC — but that is an accidental majority produced by CDNs upgrading small sites by
default. Among the actual harvest-now targets (large enterprises, government, fixed-line
telecoms, industrial infrastructure) readiness falls to **35–40%**, and over 10% of top sites
still lack TLS 1.3 entirely.

Regulatory deadlines converging on 2030:

| Jurisdiction | Deadline |
|---|---|
| US | Executive order sets 2030 for PQC key establishment *(as captioned, "Executive Order 14412" — verify the number before citing it)* |
| EU | PQC written into NIS2, targeting December 2030 for critical infrastructure and high-risk uses |
| Germany (BSI) | 2030 critical infrastructure, 2032 all commercial enterprises |
| Australia (ASD) | Traditional asymmetric cryptography eliminated by 2030 |

Cost context: average breach cost $4.44M against 241-day dwell time.

This is characterised as **harder than Y2K**, and the comparison holds up. Nearly two decades of
the same large-prime mathematics are embedded in web traffic, VPNs, code signing, cryptocurrency
and disk encryption. Some of it — self-encrypting drives, for instance — cannot be patched at all
and requires physical replacement. Y2K was a date format; this is the trust foundation of
everything.

F5 is a member of the NIST NCCoE Migration to PQC consortium.

---

## 6. Network infrastructure as the unmonitored hop

### The blind spot

Endpoint detection is now genuinely well deployed — laptops, servers, VMs, containers, mobile.
Attackers respond rationally by going where the agents are not: network appliances running custom
hardware and operating systems, where manufacturers have historically resisted third-party
security agents.

China-nexus actors in particular exploit these appliances, establish a foothold, and move
laterally. Defenders only see the intrusion once it reaches a protected endpoint — by which point
the attacker has been resident in the path for some time.

The speed figures make this urgent rather than theoretical. When a CVE is published with exploit
code, nation-state exploitation follows within roughly **48 hours on average**, and **as fast as
24 hours** for China-nexus actors. Frontier models accelerate discovery, the rest of the attacker
toolchain is AI-augmented, and agents and sub-agents now perform lateral movement themselves. The
skill barrier has dropped alongside the time. Patching in weeks or months is not a slow process;
it is a non-participating one.

### Why a load balancer is a high-value target

This is the part worth understanding properly. A BIG-IP performs TLS decryption and
re-encryption, which means plaintext traffic and private keys pass through it by design.
Compromising it does not just grant a foothold on the network — it grants the cleartext. An
appliance with no security agent on it, holding the keys, sitting in the path of everything, is
close to an ideal target.

### What the integration does

A CrowdStrike Falcon sensor runs **on** BIG-IP, protecting the **control plane with no impact on
the data plane** — the separation matters, because anything that adds latency or risk to traffic
processing would not be deployable. Sensor updates use CrowdStrike's zero-touch Linux capability:
auto-update on the appliance with no reboot and no downtime, with new detections delivered as
content updates. On an appliance that cannot take a maintenance window, that property is the
whole deal.

The zero-trust argument follows directly: zero trust is not achievable while an unmonitored
device sits in the path between monitored ones. With sensors on both the appliance and the end
hosts, visibility becomes continuous across every hop.

On scale and alert economics: machine learning plus a human threat-hunting team (OverWatch)
reduce roughly **7 trillion events per day** to about **14 million hunting leads** and
approximately **36,000 customer notifications** *(as captioned; the timeframe on the last figure
is unclear)*. The division of labour is the point — ML handles known-bad patterns, humans hunt
novel tradecraft.

Organisationally, larger customers are merging NetOps and SecOps, and the joint tooling is
designed to alert each side to the other's anomalies. CrowdStrike is an inaugural partner in F5's
ADSP ecosystem, and complimentary Falcon sensors for BIG-IP fleets are offered through the
session resources.

---

## 7. The operational problem underneath all of it

A platform buys time. It does not change what the organisation does with that time, and this is
where the summit is most candid: if your operating model does not change, a hardened platform
alone will not save you.

### More releases, same team

Every vendor is responding to AI-accelerated discovery the same way — more releases, more often.
That load lands on the same finite operations team. The industry's fix for the discovery problem
is therefore an operational burden multiplier for its customers.

F5's own response is a **six-week hardened release cadence**, introduced September 2026, replacing
a quarterly cycle. Each release bundles fixes from automated scanning, external researchers and
internal hardening.

The guidance attached to it is the part that changes practice: **treat every hardened release as
if it closes a critical gap**, regardless of the severity labels. The reasoning is sound —
attackers chain low- and medium-severity flaws into high-severity outcomes, so severity scoring of
individual issues systematically understates the risk of leaving a batch unapplied. Staying
current becomes a core security discipline rather than routine maintenance.

### Scanning your own code with frontier models

F5 runs a continuous five-step loop against its own source and field diagnostic data, using
frontier models from OpenAI, Google and Anthropic, adding each new model on release — explicitly
chosen not to bet on a single lab, since models differ in what they find. Results flow into
BIG-IP, NGINX, Distributed Cloud and the AI Security Platform. Written up publicly by F5's Chief
Product Officer, Kunal Anand (linked in the resources).

The generalisable point: the same capability that makes attackers faster is available to
defenders against their own code, and the asymmetry is that you have the source and they do not.

### Making deployment survivable

A six-week cadence is only viable if deployment is close to free, which is what the fleet
management tooling (F5 Insight for ADSP) targets. The mechanics shown:

- Fleet inventory distinguishing current from exposed instances
- Software **distribution** decoupled from **installation**, each with a pre-execution readiness
  check — so the slow, bandwidth-heavy part happens ahead of the maintenance window and the
  window itself contains only the switch
- Pre- and post-flight snapshots, strict RBAC, and verification after the fact

Claimed outcome: minutes rather than a maintenance weekend.

### Fundamentals still come first

Three principles worth keeping, because they cut against the sales narrative:

**There is no AI silver bullet.** Asset inventory, access control and software currency still come
first.

**AI cannot compensate for weak visibility.** Pointed at an environment nobody has inventoried,
an agent will simply be confused at machine speed. Automation amplifies whatever discipline
already exists, including its absence.

**Run disciplined fundamentals faster.** The change is speed and rehearsal, not a different set of
practices.

---

## 8. The analyst view

Forrester's contribution is useful mainly because it is not selling anything, so it functions as
a check on the rest.

**Where security leaders are.** 42% name improving application and product security a top
priority — the highest response every year, and higher than usual this year. Agentic AI tops the
emerging-technology list; quantum security is in the top 10 and rising, and has been the top
inbound client topic all year. On Mythos specifically, the questions are about explaining it to
boards, separating real from hype, and preparing for an influx of vulnerabilities — which is to
say the demand is for framing, not tooling.

**When the patch window hits zero**, the recommended model is proactive security — discover,
prioritise, remediate — with prioritisation based on what is actually discoverable and
exploitable *in your environment*, rather than on raw CVSS. Add virtual patching, because not
everything can be patched in time, and automate everything. The Black Hat 2026 read-through was
that security automation has moved from aspirational to not optional, purely to keep pace with
Mythos-era discovery rates.

**AI-powered WAF is table stakes**, with a learning curve attached — a useful corrective to the
efficacy numbers above.

**The market is consolidating** from standalone WAF to unified platforms: core of WAF, basic bot
management, API security and client-side protection; adjacencies including LLM firewall, L7 DDoS
and SOC operations; heritage services of CDN, DDoS and DNS. The buyer-side warning is to demand a
genuinely unified UI and data model rather than an in-name-only platform assembled from
acquisitions — which is a direct test to apply to F5's own ADSP pitch.

**Deployment is moving back on-premises.** Buyers increasingly want some or all of an
application-security solution on-prem, and some are repatriating outright, choosing per
application on operations, sovereignty and cost. Sovereignty is about the second-most-cited
reason. This is the demand behind the air-gapped editions above.

**On Q-day**, migration may take a decade and there probably is not a decade. The recommended
structure is a cross-functional team spanning security, infrastructure, development, risk,
emerging tech and — critically — **procurement**, since vendor timelines are the dependency you
cannot engineer around. Start with cryptographic discovery on crown jewels, and expect to find
old junk: short RSA/ECC keys, SHA-1, MD5, retired symmetric ciphers. Then pick a play per item —
upgrade the library, replace the infrastructure, or front it with a proxy — and build in
crypto-agility, because nobody wants to run this exercise twice. Begin by educating executives.

**The single piece of advice: discovery.** APIs, cryptography, LLMs developers have adopted,
unknown AI agents. You cannot control what you do not know about — and every other
recommendation in the summit presupposes an inventory that most organisations do not have.

---

# Reference

## Session catalogue

The index back to the videos. ON24 console titles differ slightly from the email and landing-page
titles; both are given. Runtimes are exact, taken from each webcast's on-demand end marker and
cross-checked against the final caption timestamp. "Console #" is the ON24 agenda order.

| Console # | Title | Speaker(s) | Runtime | Covered in |
|---|---|---|---|---|
| 1 | **Your greatest risk surface just met frontier AI** (ON24: "The Greatest Risk Surface") | John Maddison — Chief Marketing Officer, F5 | 12:29 | [§1](#1-the-patch-window-inverted) |
| 2 | **When Patching Isn't Fast Enough** | Michael Montoya — Chief Technology Operations Officer, F5 | 17:34 | [§7](#7-the-operational-problem-underneath-all-of-it), [§1](#1-the-patch-window-inverted) |
| 3 | **WAAP for the Post-Mythos World** (ON24: "...Post-Mythos **Era**") | Nirav Shah — SVP of Product Marketing, F5 | 16:11 | [§2](#2-application-and-api-defence) |
| 4 | **What CISOs Should Expect Next** (fireside) | Nirav Shah (F5) with Sandra "Sandy" Carielli — VP & Principal Analyst, Forrester Research | 21:52 | [§8](#8-the-analyst-view) |
| 5 | **Securing AI in Production** | Mani Ganesan — VP of Product Management, AI Security, F5 | 9:10 | [§4](#4-securing-ai-itself) |
| 6 | **Trust in the Age of AI Agents** | Vikas Shetty — VP of Product Management (Bot Defense), F5 | 9:01 | [§3](#3-automated-and-agentic-traffic) |
| 7 | **PQC Readiness Starts Now** | Joel Moses — VP of Strategic Engineering & CTO for Systems & Platforms, F5 | 13:13 | [§5](#5-post-quantum-readiness) |
| 8 | **Closing Security Blind Spots** (ON24 internal name: "Illuminating Security Blind Spots") | Gary Newe (F5) with Chris Kachigian (CrowdStrike) | 20:19 | [§6](#6-network-infrastructure-as-the-unmonitored-hop) |

Sessions 1–3 and 5–7 are lightning talks and the keynote; 4 and 8 are fireside chats.

**Speaker titles conflict across F5's own sources** for the CrowdStrike fireside:

| Person | f5.com landing page | ON24 speaker record | As introduced in the video |
|---|---|---|---|
| Gary Newe | Regional Vice President, Solutions Engineering, F5 | Vice President of Solutions Engineering, F5 | Regional Vice President of Global Solution Architects |
| Chris Kachigian | Global Vice President, Global Solution Architecture, CrowdStrike | Sr. Director of Technology, Cloud & AI Ecosystems, CrowdStrike | Senior Director of Solution Architecture, CrowdStrike |

**The promised Bot Defense "first look" is not a separate session.** It is session 6, *Trust in
the Age of AI Agents*, whose ON24 abstract covers agentic AI detection and Device Intelligence.
The console lists exactly eight sessions with no standalone Bot Defense item.

**Actual depth.** Despite the billing ("executive strategy through deep technical architecture"),
six of the eight are strategy and product positioning. Only the WAAP session (attack demo) and
*When Patching Isn't Fast Enough* (fleet-update demo) show a product working.

## Resources (ON24 "Related Content")

The four PDFs were downloaded on 18 September 2026 and are **not committed** — this repository is
public and they are F5 and third-party copyrighted documents. They are in the local archive
described under [How this was captured](#how-this-was-captured).

| Session | Resource | Type |
|---|---|---|
| Keynote | [Enterprise cybersecurity in a shifting threat landscape](https://www.f5.com/security#overview) | Web page |
| Keynote; Patching; CISOs | [Defend against frontier AI threats at runtime](https://www.f5.com/frontier-ai-defense#threat-landscape) | Web page |
| Keynote | [F5's AI-powered WAF advances virtual patching for the post-Mythos era](https://www.f5.com/company/blog/advance-virtual-patching-with-f5-for-post-mythos-era) | Blog |
| Keynote | [Maintaining application resilience when frontier AI outpaces the patch](https://www.f5.com/resources/white-papers/maintaining-application-resilience-in-frontier-llm-era) | White paper |
| Patching | [Securing our code with frontier AI: What F5 built and learned](https://www.f5.com/company/blog/securing-our-code-with-frontier-ai-what-f5-built-and-learned) | Blog |
| Patching | [Enterprise application delivery and security reference architecture](https://www.f5.com/resources/reference-architectures/enterprise-application-and-delivery-reference-architecture) | Reference architecture |
| Patching; Agents | [SecureIQLab Cloud WAAP v5.0 CyberRisk Validation Comparative Report](https://interact.f5.com/rs/653-SMC-783/images/Report-Cloud_WAAP_CyberRisk_Validation_Comparative_Report_Final.pdf?version=0) | PDF report |
| WAAP | [2026 State of Application Security Strategy](https://interact.f5.com/rs/653-SMC-783/images/eBook_SOAS-Security-2026.pdf?version=0) | PDF ebook |
| CISOs | [F5 web application and API protection solutions](https://www.f5.com/solutions/web-app-and-api-protection) | Web page |
| AI in Production | [AI Security Platform](https://www.f5.com/products/ai-security-platform) · [AI Guardrails](https://www.f5.com/products/ai-guardrails) · [AI Red Team](https://www.f5.com/products/ai-red-team) · [Workforce AI Security](https://www.f5.com/products/workforce-ai-security) | Product pages |
| AI in Production | *F5 AI Guardrails: Validated Protection Against Real-World AI Attacks* — SecureIQLab, Aug 2026 | **PDF, ON24-hosted (7.4 MB)** |
| Agents | *Trust in the autonomous age* (ebook) | **PDF, ON24-hosted (0.4 MB)** |
| Agents | [Distributed Cloud Bot Defense product tour](https://www.f5.com/resources/demos/f5-distributed-cloud-bot-defense-demo) | Demo |
| PQC | [F5 post-quantum cryptography readiness solutions](https://www.f5.com/solutions/post-quantum-cryptography-readiness) | Web page |
| PQC | *PQC Readiness for Dummies* (ebook) | **PDF, ON24-hosted (3.8 MB)** |
| Blind Spots | [CrowdStrike Falcon sensor support for F5 BIG-IP](https://www.f5.com/partners/technology-alliances/crowdstrike) | Partner page |
| Blind Spots | *Deploy the CrowdStrike Falcon sensor on your BIG-IP systems* (solution overview) | **PDF, ON24-hosted (0.3 MB)** |
| Blind Spots | [Request complimentary CrowdStrike Falcon sensors for BIG-IP](https://www.f5.com/go/contact/request-crowdstrike-falcon-sensors-for-big-ip) | Offer form |
| (Hub-wide) | [F5 Labs CASI and ARS Leaderboards](https://www.f5.com/labs/casi) | Web page |

The four **bold** PDFs are hosted inside ON24 and disappear with the library. The rest are public
f5.com and interact.f5.com URLs that should outlive it.

No slide decks exist — the ON24 player shows video only, with a blank slide placeholder.

## How this was captured

- **Source.** The ON24 console for event `5460330`, signed in as the registrant on 18 September
  2026 and driven with Playwright in a visible Chromium. Metadata came from the console's own JSON
  endpoints: hub content list (abstracts, related content), speaker list, and each webcast's
  console data (caption file list, on-demand end offset).
- **Captions.** Each session exposes an English WebVTT track. The keynote and *Securing AI in
  Production* are clean edited captions; the other six are machine ASR with per-cue confidence
  notes. Auto-translated French, German, Chinese (Simplified) and Japanese tracks exist and were
  not collected.
- **Local archive (not in git).** `~/NaughtyFish/f5-security-summit-2026-archive/` holds
  `transcripts/` (plain text, one file per session, about 18,000 words total), `captions-vtt/`,
  `resources/` (the four ON24-hosted PDFs) and `on24-metadata/` (hub JSON). Kept out of this
  public repository deliberately. **Move it to private storage before the machine is wiped or
  rebuilt** — it holds the only copies of the four PDFs that vanish with the library.
- **Not collected.** The video files themselves; ON24 streams them as DASH segments.
- The one-pager PDF attached to the Awan Distribution email (Gmail IDs `1a085eda14491b71` /
  `1a085fd928199bb7`) is still unread. Its purpose is now covered by the console capture.

## Open items

- [ ] Decide where the local archive lives long-term: private repo, Drive or SharePoint
- [ ] Verify the Mythos → vendor attribution in [§1](#what-mythos-was) before external use
- [ ] Verify the US executive-order number cited in [§5](#timelines-and-the-case-for-acting-now)
- [ ] Brief the team on sessions 3, 5 and 6 against live engagements
- [ ] Optionally download the Awan one-pager from Gmail for completeness

## Relevance to current work

Editorial context, not asserted by any session. The summit maps onto F5 work in flight during
September 2026:

| Summit topic | Related area of active work |
|---|---|
| WAAP for the Post-Mythos World | Advanced WAF deployments; on-prem WAF evaluations |
| Trust in the Age of AI Agents | API gateway and API discovery requirements |
| Securing AI in Production | F5 AI Insights / AI Assistant evaluation |
| When Patching Isn't Fast Enough | Hardened-release cadence migrations |

Two details bear directly on that work. The **six-week hardened release cadence** with the advice
to treat every release as critical is the cadence in-flight migrations must absorb, and fleet
management is F5's answer to absorbing it. **API Security Local Edition** for air-gapped
environments addresses on-prem-only banking requirements directly.

> **Note.** This repository is public. Customer names, deployment details and engagement status
> were deliberately removed from this section. Keep that mapping in the private archive with the
> transcripts.

## Related F5 announcements — September 2026

From the *F5 Partner Connect newsletter — September 2026*, which carried the summit as its lead
item:

- **F5 AI Security Platform** — visibility, governance and protection for AI applications,
  models, agents and APIs
- **F5 acquires SurePath AI** — network-based AI visibility, intent classification, shadow-AI
  detection
- **F5 named a WAAP leader** in independent testing
- **Next-generation F5 AI Gateway** — AI cost, security and control
- **F5 Insight** — AI-powered fleet management for BIG-IP
- **AI Runtime Security Learning Path** — partner enablement
- **Citrix Compete / NetScaler replacement kit**

## Source emails

Nine messages, chronological, times UTC.

| # | Date | From | Subject | Gmail ID |
|---|---|---|---|---|
| 1 | 7 Sep, 02:00 | `o.anderson@f5.com` | Announcing the F5 Post-Mythos Security Summit | `1a079988159ab662` |
| 2 | 7 Sep, 07:27 | `ahmer.ghazi@innovativeintegration.net` | Fwd: Announcing the F5 Post-Mythos Security Summit | `1a07ac3f0eef0970` |
| 3 | 9 Sep, 06:01 | `o.anderson@f5.com` | F5 Partner Connect newsletter — September 2026 | `1a084c1928347c40` |
| 4 | 9 Sep, 11:28 | `muhammad.khan@awandistribution.com` | Your App, API and AI risk surface just changed **(PDF attached)** | `1a085eda14491b71` |
| 5 | 9 Sep, 11:46 | `ahmer.ghazi@innovativeintegration.net` | Fwd: of #4 **(PDF attached)** | `1a085fd928199bb7` |
| 6 | 9 Sep, 12:13 | `o.anderson@f5.com` | You're on the list! *(Add to Calendar)* | `1a086163b0687541` |
| 7 | 10 Sep, 02:00 | `o.anderson@f5.com` | We're LIVE: Security for the post-Mythos world | `1a0890c029b1adbf` |
| 8 | 14 Sep, 02:00 | `o.anderson@f5.com` | Your summit sessions are live. Get started. | `1a09da4d790709ea` |
| 9 | 17 Sep, 15:39 | `o.anderson@f5.com` | You're in! Access your on-demand sessions | `1a0b005a522c7263` |

| Role | Name | Contact |
|---|---|---|
| F5 summit mailings | Olivia Anderson | `o.anderson@f5.com` |
| Distributor — registration queries | Muhammad Ahmed Khan, Channel Account Manager, Awan Distribution | `muhammad.khan@awandistribution.com` |
| Internal forwarder | Ahmer Ghazi | `ahmer.ghazi@innovativeintegration.net` |
