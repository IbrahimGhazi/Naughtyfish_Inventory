# F5 Virtual Security Summit 2026 — "Security for the Post-Mythos World"

**Archival record compiled 17 September 2026; session content added 18 September 2026.**

This document exists because the summit's on-demand video library is taken offline on
**30 October 2026**. It was first reconstructed from the nine emails in the
`ibrahim.ghazi@innovativeintegration.net` mailbox that relate to the summit. On 18 September it
was extended with the substance of the sessions themselves, captured from the ON24 console while
signed in as that registrant: official abstracts, exact runtimes, speaker records, the Related
Content lists, and the English caption tracks of all eight sessions.

> **Scope note — read this first.** The per-session summaries below are written from each
> session's English caption track, not from memory of watching. Six of the eight tracks are
> machine speech-recognition (ON24 marks them with per-line confidence scores). Names, product
> terms and some figures come through garbled, for example "FI" for F5, "Mitho" for Mythos and
> "WAFF" for WAF. Those have been corrected where the meaning is unambiguous. Figures the
> recognizer may have misheard are marked *(as captioned)*. See
> [How this was captured](#how-this-was-captured).

---

## Deadline

| | |
|---|---|
| **On-demand access ends** | **30 October 2026** (treat as hard deadline) |
| Days remaining as of 18 Sep 2026 | 42 |
| Consequence | All session videos become unavailable. There is no stated archive or extension. |

**Date discrepancy in the sources.** Four F5 sources give three different end dates:

| Source | Stated end |
|---|---|
| Awan Distribution partner invitation, and its one-pager `F5 Virtual Security Summit_10th Sept to 30th Oct.pdf` | 30 October 2026 |
| *F5 Partner Connect newsletter — September 2026* | 31 October |
| FAQ on `f5.com/virtual-security-summit-2026` (checked 18 Sep) | "September 10 – October 31, 2026" |
| ON24 console sign-in page (checked 18 Sep) | "replay is available until November 1, 2026 11:55 AM PST" |

The ON24 date is the platform's own setting and probably the real cut-off. **Still plan to
30 October.** It is the earliest date F5 has published anywhere, and nothing guarantees the
later dates will be honoured.

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
| Viewing model | Register once, stream every session in any order, on your own schedule |
| Registration page | `https://www.f5.com/virtual-security-summit-2026` |
| Registered under | `ibrahim.ghazi@innovativeintegration.net` (F5's mailings address the recipient as "Muhammad") |
| Invited via | Awan Distribution (F5 distributor), forwarded internally by Ahmer Ghazi |
| ON24 registrant count | 174 on the keynote webcast, as reported by the console on 18 Sep |

### Why this landed as a "meeting invite"

The email that reads most like a calendar invitation is **"You're on the list! F5 Virtual
Security Summit reminders"** (9 Sep 2026), which carries an **Add to Calendar** control. It is
not a meeting — it is a launch-day reminder for an on-demand library. No `.ics` attachment was
ever sent, and no corresponding event exists in the Google Calendar for this account.

---

## Access

The canonical, non-personalised entry point is:

```
https://www.f5.com/virtual-security-summit-2026
```

The keynote plays on that page without signing in. The other seven sessions need the ON24
console. The direct ON24 "Access on-demand sessions" links are **personalised tracking URLs**
on `buzz.f5.com` that encode the recipient's identity. They are deliberately **not** copied into
this repository. To retrieve one, open either of these messages in Gmail:

| Message | Date | Gmail message ID |
|---|---|---|
| "You're in! Access your F5 Security Summit on-demand sessions" | 17 Sep 2026 | `1a0b005a522c7263` |
| "Your summit sessions are live. Get started." | 14 Sep 2026 | `1a09da4d790709ea` |

The link lands on an ON24 sign-in page that asks only for the registered email address.

---

## The core argument of the summit

One thesis runs through every session, stated most plainly in the 14 September email:

> Exploits increasingly arrive before organizations can patch. That's changing how security
> leaders think about risk, remediation, and runtime protection.

The supporting premise, from the announcement email:

> Frontier AI has fundamentally changed the vulnerability lifecycle. Models can now discover
> vulnerabilities at machine speed, and exploits increasingly appear before your security
> teams can patch them.

And from the distributor's framing:

> Frontier AI is reshaping the threat landscape faster than most security teams can keep up —
> accelerating vulnerability discovery, automating attacks, and shrinking the gap between
> exploitation and remediation to almost nothing.

The sessions reduce that to one piece of arithmetic, repeated by Maddison, Montoya and Shah.
The **median enterprise patch cycle is about 20 days** and has not changed in eight years. The
**estimated time from disclosure to exploitation is now about −7 days**: exploitation starts
roughly a week *before* a vulnerability is published. Montoya attributes the −7 figure to
Mandiant's M-Trends 2026 data. Shah cites "Zero Day Clock" research built on more than 3,500
CVE-to-exploit pairs, which shows the window at over two years in 2018. F5's answer is the same
in every session: you cannot win the race to find bugs or the race to fix them, so win at
**runtime, in the data path**. That means AI-scored inspection of every request and virtual
patching while the real fix goes through normal change control.

### What "Mythos" means

**Mythos is a frontier AI model.** Neither the emails nor the landing page define it, but the
keynote does, in its opening minute. John Maddison:

> "Mythos made this evolution impossible to ignore. In prerelease testing, one model surfaced
> thousands of working zero-days across every major operating system and every major browser."

He closes the same way: "Mythos will not be the last model of its kind." The model found
"thousands" of working zero-days, including a 27-year-old flaw in OpenBSD, an OS he describes
as "chosen specifically for its security record". Michael Montoya puts it in the "frontier tier"
next to "GPT cyber": models that can chain exploits across complex code bases, access-restricted
today but, in his words, capabilities that "diffuse downwards". Forrester's Sandy Carielli says
her clients' questions about "Mythos and other models" are mostly about how to explain it to
their boards and how to separate what is real from what is hype.

**"Post-Mythos" therefore means the period after that model's capabilities became public.** It
is the point where AI-driven discovery of working exploits stopped being theoretical, and the
summit treats it as a permanent change in the patch-versus-exploit race.

*Outside context, not stated in the summit:* the details match **Anthropic's Claude Mythos
Preview**. Anthropic announced it on 7 April 2026 alongside *Project Glasswing*, a restricted
defensive-use programme, and did not release it publicly. Public reporting at the time cited
thousands of zero-days across every major OS and browser and a 27-year-old OpenBSD bug. See
[Help Net Security, 8 Apr 2026](https://www.helpnetsecurity.com/2026/04/08/anthropic-claude-mythos-preview-identify-vulnerabilities/)
and [Anthropic — Project Glasswing](https://www.anthropic.com/project/glasswing). F5 never names
the vendor in any session.

### Four stated outcomes

The distributor invitation lists what an attendee should walk away with:

1. **Eliminate the patch window** — deploy real-time, automated defenses that shield the fleet
   the second a zero-day hits.
2. **Protect app and AI portfolios** — secure both legacy application architectures and modern,
   emerging AI models.
3. **Defeat advanced agentic fraud** — accurately distinguish legitimate AI transactions from
   malicious bot traffic.
4. **Build a post-quantum roadmap** — walk away with three practical steps toward PQC readiness.
   *The three steps are **Scope it, Govern it, Protect it**; see
   [PQC Readiness Starts Now](#pqc-readiness-starts-now--joel-moses).*

### Topic tracks

The ON24 library is organised into four tracks:

- Frontier AI and AI Security
- Web Application and API Protection (WAAP)
- Bot Defense and Agentic AI
- PQC Readiness

### The one-platform picture

Every F5 speaker reuses one architecture slide. On the left is everything that talks to the
business: human users, bots and autonomous agents. On the right are apps, APIs and models. In
the middle is "one hardened platform" in the data path, combining four capabilities: **AI-powered
WAAP, Bot Defense, AI Security and post-quantum readiness**. Maddison argues these cannot be
"four consoles, four policy engines, and four vendors", because at machine speed fragmentation
becomes "yet another vulnerability". The platform name used on screen and in speech is **F5
ADSP** (Application Delivery and Security Platform).

---

## Session catalogue

Eight sessions: one keynote, five lightning talks and two fireside chats. The ON24 console uses
slightly different titles from F5's emails and landing page. Both are given. Runtimes are exact,
taken from each ON24 webcast's on-demand end marker and cross-checked against the final caption
timestamp. "Console #" is the order the ON24 agenda lists them in.

### Keynote

| | |
|---|---|
| **Title (emails / f5.com)** | Your greatest risk surface just met frontier AI |
| **Title (ON24 console)** | The Greatest Risk Surface |
| **Speaker** | John Maddison — Chief Marketing Officer, F5 |
| **Runtime** | **12:29** |
| **Console #** | 1 |
| **Track** | Frontier AI and AI Security |
| **Source** | "We're LIVE" (10 Sep), "Your summit sessions are live" (14 Sep) |

### Lightning talks

F5 describes these as "F5 leaders share methods for building preemptive defenses".

| # | Title (emails) | ON24 title, if different | Speaker | Runtime | Console # | Track |
|---|---|---|---|---|---|---|
| 1 | When Patching Isn't Fast Enough | — | **Michael Montoya** — Chief Technology Operations Officer, F5 | **17:34** | 2 | Frontier AI / runtime protection |
| 2 | WAAP for the Post-Mythos World | WAAP for the Post-Mythos **Era** | **Nirav Shah** — SVP of Product Marketing, F5 | **16:11** | 3 | WAAP |
| 3 | Trust in the Age of AI Agents | — | **Vikas Shetty** — VP of Product Management (Bot Defense), F5 | **9:01** | 6 | Bot Defense and Agentic AI |
| 4 | PQC Readiness Starts Now | — | **Joel Moses** — VP of Strategic Engineering & CTO for Systems & Platforms, F5 | **13:13** | 7 | PQC Readiness |
| 5 | Securing AI in Production | — | **Mani Ganesan** — VP of Product Management, AI Security, F5 | **9:10** | 5 | Frontier AI and AI Security |

### Fireside chats

| # | Title | Participants | Runtime | Console # | Stated focus |
|---|---|---|---|---|---|
| 6 | What CISOs Should Expect Next | **Nirav Shah** (F5) with **Sandra "Sandy" Carielli** — VP & Principal Analyst, Forrester Research | **21:52** | 4 | What CISOs should demand from their security vendors |
| 7 | Closing Security Blind Spots (ON24 internal webcast name: "Illuminating Security Blind Spots") | **Gary Newe** (F5) with **Chris Kachigian** (CrowdStrike) — titles disputed, see below | **20:19** | 8 | Extending CrowdStrike Falcon visibility to F5 network infrastructure |

**Speaker-title discrepancies.** F5 published three different sets of titles for the CrowdStrike
fireside:

| Person | f5.com landing page | ON24 speaker record | As introduced in the video |
|---|---|---|---|
| Gary Newe | Regional Vice President, Solutions Engineering, F5 | Vice President of Solutions Engineering, F5 | Regional Vice President of Global Solution Architects |
| Chris Kachigian | Global Vice President, Global Solution Architecture, CrowdStrike | Sr. Director of Technology, Cloud & AI Ecosystems, CrowdStrike | Senior Director of Solution Architecture, CrowdStrike |

### Product first-look — resolved

The announcement email promised "a first look: how F5 Bot Defense is evolving for the agentic AI
era, from AI agent detection to device intelligence". **It is not a separate session.** It is
session 3, *Trust in the Age of AI Agents*. The ON24 abstract for that session says "F5 will
showcase how Bot Defense is evolving with agentic AI detection and Device Intelligence". The
console lists exactly eight sessions and no standalone Bot Defense item. The bot-defense
material attached to session 3 is the ebook *Trust in the autonomous age* and a Distributed
Cloud Bot Defense product tour.

### Audience level

> Sessions run the gamut from executive-level strategy to deep technical architecture, so
> there's something here whether you're setting security strategy or defending it in the
> trenches.

In practice six of the eight are strategy and product positioning. Only the WAAP session
(attack demo) and *When Patching Isn't Fast Enough* (F5 Insight fleet-update demo) show a
product working.

---

## Session content

Each entry gives the official ON24 abstract, paraphrased closely, followed by a summary of what
was actually said, built from the caption track.

### Keynote — Your greatest risk surface just met frontier AI (John Maddison, 12:29)

**Abstract.** The opening keynote on the forces expanding the threat landscape: AI agents as
both users and adversaries, unchecked API growth, enterprise AI adoption outpacing its own
security, and quantum harvesting already underway. It shows where these converge on the single
greatest risk surface (the applications, APIs and AI models that run the business) and how the
other sessions map to defending it.

**What was said.**

- **Defines Mythos** (see [What "Mythos" means](#what-mythos-means)). The defining feature of the
  post-Mythos landscape is "exploits now outrun patches". That used to be the worst case and is
  now normal operating conditions.
- **The loop.** Apps, APIs, AI services and agents keep multiplying. Frontier AI lets attackers
  work through them faster than defenders respond. Pre-disclosure exploitation (mean time to
  exploit about −7 days) means CVE scanners cannot flag what is not yet published. Every patch a
  vendor ships is diffed and weaponised before most enterprises deploy it. Each turn makes the
  next one faster.
- **Four numbers.** *Thousands* of working zero-days from one model. *27 years*, the age of the
  OpenBSD flaw it found. *20 days*, the median enterprise patch cycle, and that is a well-run
  programme. *−7 days*, the disclosure-to-exploit window. The window is now shorter than the
  approval chain, so "only what is already decided and rehearsed will happen in time". It is a
  speed problem, not a visibility or framework problem.
- **Three races.** You cannot win the *find* race or the *fix* race. You can win at *runtime*:
  enforcement in the data path that scores every request and acts as a virtual patch. This has
  moved "from best practice to a precondition".
- **Signature WAFs are permanently one step behind.** AI-generated exploits vary payloads and
  adapt to responses. Defence has to baseline normal behaviour per application and block
  deviations, even for attacks with no name yet.
- **Your own AI is attack surface, in two halves.** The AI employees use (third-party models and
  agents) needs AI access security and agentic endpoint security. The AI you build (chatbots and
  agents on your data and APIs) needs protection from prompt injection, tool misuse and data
  leakage. One platform, plugged into existing enforcement points: endpoint, SASE, WAAP and
  gateways.
- **What F5 did to its own code.** F5 runs a model-agnostic scanning harness that points
  multiple frontier models at its own codebase. It ships the results as **hardened software
  releases** that bundle many fixes, and is investing in fleet management so customers can
  deploy them. The guidance is "Always run the latest release."
- **Architecture.** "The attacker chooses the vulnerability, you choose what your traffic is
  allowed to do." Four capabilities (AI-powered WAAP, bot defense, AI security, PQC readiness)
  on one hardened platform in one data path.

### When Patching Isn't Fast Enough (Michael Montoya, 17:34)

**Abstract.** Frontier AI accelerates vulnerability discovery and exploit development. Why active
security, virtual patching and runtime protection become essential when patch windows approach
zero.

**What was said.** The platform buys time. This session is about what the organisation does with
that time.

- **Speaker background (self-introduced):** former CISO-level roles (he names Equinix and Digital
  Realty), earlier Microsoft, Mandiant, FireEye and BlueVoyant. He now leads AI and technology
  operations at F5.
- **The operational problem.** Every vendor is responding to frontier-AI discovery the same way,
  with more releases more often. That load lands on the same finite team. "If your operating
  model doesn't change, a hardened platform alone will not save you."
- **The chart.** Disclosure-to-exploit time fell from 771 days (2018) to about 10 months (2021),
  then kept falling to an estimated −7 days in 2026, per Mandiant M-Trends 2026. The average
  time to deploy a patch stayed at 20 days the whole time. The 20 days is change control,
  testing, maintenance windows and HA working as designed. "The process is not broken. It was
  just built for a world that no longer exists."
- **Three tiers of offensive AI.** (1) Broadly available models are already effective at reverse
  engineering, pentesting and vulnerability research. (2) The frontier tier, "Mythos and GPT
  cyber", chains exploits across complex code bases and is access-restricted for now. (3)
  Hundreds of new open-source projects each week do agent-backed red teaming and web
  vulnerability assessment. Machine-speed offence will not stay with nation states.
- **Three principles.** No AI silver bullet: hygiene (asset inventory, access control, software
  currency) still comes first. AI cannot compensate for weak visibility or patching ("an AI
  agent will simply be confused at machine speed"). Run disciplined fundamentals at machine
  speed, automated and rehearsed.
- **Runtime side.** The AI-powered WAF scores every request inline, behaviourally, so a
  vulnerability with no CVE can still be blocked. Virtual patches go in at once, so "your
  20 day process can stay at 20 days because the exposure window closes on day 0".
- **F5's own harness.** A five-step loop runs continuously against F5 source code and field
  diagnostic data. It uses frontier models from OpenAI, Google and Anthropic and adds each new
  model on release, "intentionally chosen not to bet on just one lab". Findings ship into
  BIG-IP, NGINX, Distributed Cloud and the AI Security Platform. Chief Product Officer Kunal
  Anand has written publicly about it (linked in the resources).
- **Hardened releases every six weeks** (introduced "earlier this month", i.e. September 2026),
  replacing a quarterly cadence. The cycle is find, fix, ship every six weeks, deploy
  fleet-wide. Each release bundles fixes from the AI harness, outside researchers and internal
  hardening. Because attackers chain low- and medium-severity flaws, **treat every hardened
  release as if it closes a critical gap**. Staying current is now "a core security discipline",
  not maintenance.
- **Demo: F5 Insight for ADSP fleet management.** The fleet inventory shows current versus
  exposed BIG-IP instances. Next are the device overview dashboard and a software
  *distribution* job, which is decoupled from the *installation* job, each with a pre-execution
  readiness check. Then comes installation with pre/post-flight snapshots, strict RBAC, and a
  verification back on the dashboard. The claimed outcome: "minutes, not a maintenance weekend".
- **Actions for this week:** deploy F5 Insight for fleet visibility, talk to F5 Professional
  Services about automating update workflows, and ask about F5 AI Red Team.

### WAAP for the Post-Mythos World (Nirav Shah, 16:11)

**Abstract.** WAAP is at an inflection point. Converging AI-powered WAF, API security, agentic
bot defense and DDoS mitigation, together with AI-powered risk scoring, API discovery and
consistent policy enforcement, stops AI-based attacks and zero-days, cuts false positives and
lets teams move to blocking mode faster.

**What was said.**

- The patch window "hasn't just closed, it has inverted". Traffic now includes autonomous agents
  acting for both customers and attackers.
- **Three F5 initiatives:**
  1. **AI-powered WAF.** A new risk engine analyses the intent of each request to stop zero-days
     on first contact.
  2. **Securing what's new.** Native protection for **MCP-based** applications and APIs, plus a
     new **API Security Local Edition** for fully air-gapped, regulated environments: full WAAP
     capability with zero external dependency ("digital sovereignty").
  3. **AI runtime security.** Model-agnostic threat research, dynamic guardrails and continuous
     AI red teaming.
- "An attacker can find 1000 zero days in your code, but if the exploit can't traverse the data
  path, there is no breach." The F5 stack covers what Gartner defines as core WAAP (DDoS, WAF,
  bot defense, API discovery and security) plus AI guardrails. Also called out: **client-side
  defense** against JavaScript supply-chain attacks such as Magecart, now a **PCI DSS 4.0**
  requirement if you take card payments. **Mobile App Shield** covers reverse engineering and
  device-side malware. Underneath is shared telemetry feeding an AI data fabric that correlates
  across sessions.
- **How the risk engine works.** A hybrid engine combines signature matches, attack indicators,
  continuously trained ML models, neural networks and LLMs to assess intent and produce a
  **dynamic risk score**. The score, not a rigid rule, drives policy action.
- **Claimed numbers:**
  - F5 efficacy testing on live customer traffic: detection accuracy **64% → 98%**.
  - Out-of-the-box false positives: **28% → 1%**.
  - Independent open-source WAF benchmark: 100% precision, zero false positives *(as
    captioned; the test name is garbled)*.
  - **14 zero-days caught in the field with no new signatures**, one later tied to known APT
    activity.
  - SecureIQLab Cloud WAAP CyberRisk Validation: F5 among the leaders, with **92.7% security
    efficacy, 94.7% operational efficiency**, and 100% protection on advanced threat categories
    with zero false positives.

  The point of the numbers is to "earn the right to enforce": most teams leave their WAF in
  monitor mode, and "a WAF that only logs attacks isn't protection, it's documentation".
- **Virtual patching** separates the *exposure* timeline from the *fix* timeline. The exploit is
  neutralised at the edge in minutes, and the code fix goes through normal change control with
  "no emergency releases and no heroics".
- **Demo.** F5 Distributed Cloud is the public front door (HTTP load balancer, AI-powered WAF,
  service policy engine, authoritative DNS) in front of an existing **BIG-IP VE**. BIG-IP keeps
  doing load balancing and TLS for an intentionally vulnerable origin ("Nimbus Bank").
  Onboarding is one DNS record change. Nothing new is deployed in the data centre, and the
  application code is not touched.
  - Three **SQL injection** variants (authentication bypass, UNION-based dump, and an obfuscated
    evasion variant) are all blocked by the AI-powered WAF in blocking mode.
  - A **business-logic flaw**: a negative-amount transfer on the pay endpoint that credits the
    attacker. The request is fully valid and no signature can catch it. It is closed with **one
    positive-security service policy (a regex rule) at the edge**.
- Close: "You cannot outpatch a machine-speed adversary. But you can out-architect one."

### Trust in the Age of AI Agents (Vikas Shetty, 9:01) — includes the Bot Defense first look

**Abstract.** Autonomous traffic is reshaping defence against automation. F5 showcases how Bot
Defense is evolving with **agentic AI detection and Device Intelligence**, which uncovers fraud
patterns that span devices and accounts so trust decisions can be made without adding friction
for legitimate users.

**What was said.**

- **Bot management is becoming agent management.** Frontier-AI agents reason, plan and act. They
  navigate sites, interpret content, recover from errors and complete multi-step transactions
  much as a human would. The question is no longer "is it automated?" but whether it is a
  trusted agent acting for a customer or an autonomous system doing fraud, account takeover,
  scraping or business-logic abuse.
- **Why existing approaches miss it.** Traditional bot tools judge single requests and miss
  cross-session and cross-device patterns. Fraud systems analyse transactions after completion,
  once the money is gone. Even perfect bot identification does not solve the business problem:
  you *want* AI search crawlers and shopping assistants, and credential stuffing *looks* human.
  "The solution isn't better point detection, it's better decisioning."
- **F5's approach: trust decisioning.** Persistent **device identity**, behavioural context
  across sessions, and real-time correlation of account relationships. Friction scales with
  risk: seamless for trusted users and agents, challenge or block as risk rises. It relies on
  evasion-resistant telemetry, which resists reverse engineering.
- **Agent-identity standards.** F5 natively integrates **Web Bot Auth** and **Know Your Agent**,
  so legitimate AI commerce can be welcomed, governed and even monetised. Each agent is then
  allowed, challenged, monitored or blocked based on identity, behaviour and business context.
- **Data point:** F5's analysis found **checkout** had the largest increase in automation, up
  **13.38% on mobile** *(as captioned)*. Each request looks clean on its own, so single-request
  tools miss it. The positioning line: "competitors protect traffic, F5 protects business
  workflows."
- **Customer example:** a leading global financial-services organisation that wanted to know
  which automated interactions could be trusted rather than to block more bots. F5 is helping
  it govern AI-driven interactions and reduce fraud exposure.

### PQC Readiness Starts Now (Joel Moses, 13:13)

**Abstract.** A fully functioning quantum computer may be years out, but "harvest now, decrypt
later" attacks are happening now. The session covers finding immediate exposure points, what
real crypto-agility looks like, and moving legacy systems to post-quantum standards without
breaking operations.

**The three practical PQC readiness steps** (the summit's promised deliverable):

1. **Scope it.** Isolate your focus to **asymmetric network handshakes**, especially over public
   networks. Symmetric encryption such as AES-256 protecting databases is not the problem; the
   exposure is public-key cryptography in handshakes and certificates on the wire, so put most
   resources there. **Prioritise data by "cover time"** (Mosca's theorem: how long the data
   must stay confidential). Short-lived data such as expiring card numbers has low cover time;
   PII, health records and IP have 7–10 years. With Q-day around 2030 and a five-year cover
   time, protection needed to start in 2025, so long-lived data "should already be using PQC
   today". **Treat TLS 1.3 as the non-negotiable starting line**, because PQC key exchange
   cannot be negotiated over TLS 1.2.
2. **Govern it.** Separate third-party vendor dependencies from custom in-house code. Do not
   burn engineering hours auditing vendor code. Make quantum readiness **a hard procurement
   gate** and demand a **cryptographic bill of materials (CBOM)** from every vendor, "becoming
   the regulatory standard to inventory your cryptography assets". Internal engineers then
   focus on your proprietary code.
3. **Protect it.** Build **crypto-agility**, the ability to swap cryptographic algorithms
   without interrupting a running system. Do not rewrite applications one by one, which Moses
   calls "a trap" that crushes performance and forces premature hardware refreshes. Instead
   **decouple decryption by centralising encryption handling at a gateway/full-proxy layer**
   (F5 ADSP), which terminates hybrid PQC ciphers client-side and server-side in front of
   legacy systems. The proxy also "absorbs the heavy performance tax of PQC handshakes".

**Supporting points.**

- **Q-day** is the day a quantum computer first shows it can decrypt, without the key, the kind
  of cryptography used in production. It does not break everything instantly, but it forces
  every CISO into "a new second full-time job as crypto cop". F5's prediction is **2029**,
  pulled forward by recent Harvard quantum research.
- **F5 Labs:** 54% of the top one million websites support PQC, but that is "an accidental
  majority" driven by CDNs upgrading small sites by default. For the actual harvest-now targets
  (large enterprises, government, fixed-line telecoms, industrial infrastructure) readiness
  falls to **35–40%**. Over 10% of top sites still lack TLS 1.3, which is a hard ceiling for
  PQC.
- **Why now: cost and compliance.** Average breach cost is $4.44M, with 241-day dwell time.
  Deadlines cited:
  - US: an executive order sets **2030** for PQC key establishment *(as captioned, "Executive
    Order 14412"; verify the number)*.
  - EU: PQC written into **NIS2**, targeting December **2030** for critical infrastructure and
    high-risk uses.
  - Germany's **BSI**: 2030 for critical infrastructure, **2032** for all commercial
    enterprises.
  - Australia's **ASD**: traditional asymmetric crypto eliminated by **2030**.
- **"Harder than Y2K."** Nearly two decades of the same large-prime mathematics are embedded
  everywhere: web, VPN, code signing, cryptocurrency, disk encryption. Some of it, such as
  self-encrypting drives, will need physical replacement.
- F5 is a member of the **NIST NCCoE Migration to PQC** consortium. Because NIST guidance is
  still evolving, do not hard-code new algorithms into individual apps.

### Securing AI in Production (Mani Ganesan, 9:10)

**Abstract.** As AI moves beyond copilots into connected enterprise systems it creates a new
runtime attack surface: prompt injection, excessive agency and sensitive-data exposure. How F5
helps test, govern and protect AI apps, models, agents and data.

**What was said.**

- **Four years of escalation.**
  - 2023: an individual sport (Copilot on a laptop).
  - 2024: internal chatbots, HR and IT assistants touching corporate data.
  - 2025: external, customer-facing GenAI apps and agents on non-deterministic models.
  - 2026: agentic AI that browses, calls APIs, executes code and runs workflows, often fully
    autonomously.

  Risks compound rather than replace each other. As adoption and autonomy rise, security
  control and visibility fall; the two lines crossed around 2025. F5 Labs sees "thousands of
  new techniques" every week.
- **Two threat surfaces.**
  1. **AI your workforce and agents use.** Blocking fails because employees find workarounds, so
     discover, align to policy, and observe at runtime. Workforce AI was "a big blind spot for
     our platform" until the **SurePath AI** acquisition, which became **F5 Workforce AI
     Security**. It discovers shadow AI and runs **intent classification**, identifying *how*
     AI is used (e.g. a marketing research workflow versus a UI-development agent in support).
  2. **AI apps you build.** Behaviour itself is the attack surface: prompts, models, data,
     tools, agents, actions. Two failure buckets look identical to a customer or regulator.
     *Unintended* failures: unsafe output, data leakage, an agent calling a tool it shouldn't.
     *Adversarial* ones: prompt injection, model extraction, poisoned knowledge bases,
     manipulated agents.
- **The loop:** continuous discovery of AI assets, then testing (red teaming), then hardened
  runtime protection. Agents add **non-human identity** and **agentic endpoint protection**.
  Point products leave gaps.
- **F5 AI Gateway as the control plane.** One point every AI request passes through, justified
  three ways. Cost: route to the right model and see token spend ("taming tokenomics").
  Performance: prompt optimisation and caching. Productivity: one integration and unified
  access to any model. "Security that shows up as a tax gets bypassed. Security that shows up as
  leverage gets adopted."
- **F5 AI Security Platform.** Three use cases: control workforce AI, secure the AI you build,
  deliver it efficiently. The modules are shadow-AI visibility, **AI Red Team** (apps and
  agents), **AI Guardrails** (sensitive-data controls) and the gateway. Enforcement runs inline
  at any control point, **including third-party AI gateways**, with no rip-and-replace.
  Deployment can be SaaS, self-hosted or fully air-gapped.

### What CISOs Should Expect Next (Nirav Shah with Sandy Carielli, Forrester, 21:52)

**Abstract.** How CISOs should respond as trust in traditional defences breaks down. An
independent analyst's view of how frontier AI changes the threat landscape, what to prioritise
when evaluating WAAP, and why data-path protection matters when patch cycles cannot keep pace.

**What Carielli said.**

- **Forrester survey data.** **42%** of security leaders name improving application and product
  security as a top priority. It is the highest response every year, and higher than usual this
  year. Agentic AI tops the emerging-tech list, and **quantum security** is in the top 10 and
  expected to rise.
- **Her inbound client questions.** Quantum security has been her top inbound topic all year.
  On Mythos, clients ask how to explain it to the board, how to tell real from hype, and how to
  prepare for "this explosion and influx of vulnerabilities".
- **Hybrid multi-cloud is back.** Buyers increasingly want some or all of an app-security
  solution **on-prem**, and some are repatriating. Deployment will be chosen per application on
  operations, sovereignty and cost.
- **When the patch window hits zero:** follow Forrester's *proactive security* model (Erik Nost):
  **discover, prioritise, remediate**. Prioritise the vulnerabilities actually discoverable and
  exploitable *in your environment*. Add **virtual patching**, since not everything can be
  patched in time, and **automate everything**.
- **AI-powered WAF is "table stakes"**, but there is a learning curve. A financial-services
  AppSec leader told her its main benefit was far fewer false positives, which made its
  recommendations trustworthy.
- **Black Hat 2026 takeaway:** security automation has moved from aspirational to "no longer
  optional" in order to keep up with Mythos-era vulnerability discovery.
- **WAAP market shift:** from standalone WAF to unified platforms. The core is WAF, basic bot
  management, API security and client-side protection. Adjacencies include an LLM firewall,
  L7 DDoS and SOC operations; heritage services include CDN, DDoS and DNS. Buyers should demand
  a **genuinely unified UI and data model**, not "an in-name-only platform".
- **Q-day readiness:** it is already on the CISO priority list. Migration may take a decade
  "and we probably don't have a decade". Build a **cross-functional Q-day team** covering
  security, infrastructure, development, risk, emerging tech and **procurement** (vendor
  timelines). Start with **cryptographic discovery** on crown jewels. Expect "old junk":
  short RSA/ECC keys, SHA-1, MD5, retired symmetric ciphers. Then prioritise and pick a play for
  each item: upgrade libraries, replace infrastructure, or add a proxy. Build in
  **crypto-agility** "because none of us want to do this exercise again". Start by educating
  executives.
- **Sovereignty:** more non-US clients ask for local options. Sovereignty is about the
  second-most-cited reason for repatriation.
- **Her one piece of advice for CISOs: discovery.** That covers APIs, cryptography, LLMs in use
  by developers, and unknown AI agents. "You can't control what you don't know about."

**What Shah added for F5.** About **15% of F5 WAF customers** enabled the new AI-powered
detection within two months of release. F5 is building air-gapped editions (API Security Local
Edition, on-prem AI security) because of sovereignty demand. F5 Insight is aimed at the
automation gap Carielli describes.

### Closing Security Blind Spots (Gary Newe with Chris Kachigian, CrowdStrike, 20:19)

**Abstract.** Attackers increasingly target network infrastructure beyond traditional endpoints.
The CrowdStrike–F5 partnership extends the CrowdStrike Falcon platform to the network layer,
unifying visibility across endpoints, cloud, identity and network infrastructure.

**What was said.**

- CrowdStrike is one of the **inaugural partners in F5's ADSP ecosystem**.
- **The blind spot.** Enterprises now deploy EDR well on laptops, servers, VMs, containers and
  mobile devices. Attackers take the path of least resistance: poorly managed network
  appliances running custom hardware and OSes, where manufacturers have resisted security
  agents. **China-nexus actors** in particular exploit appliances, establish a foothold and move
  laterally, so defenders only see the attack once it reaches protected endpoints.
- **Speed.** When a CVE is published with exploit code, CrowdStrike sees nation-state
  exploitation within about **48 hours on average**, and **as fast as 24 hours** for China-nexus
  actors. Frontier models speed up discovery, the rest of the attacker toolchain is AI-augmented
  too, and agents and sub-agents are now doing lateral movement themselves. The skill barrier
  has dropped along with the time. Patching "in weeks or months" is dead: "operationalise
  patching".
- **The integration.** A **Falcon sensor that runs on BIG-IP**, protecting the **control plane
  with zero impact on the data plane**. That matters because BIG-IP does TLS decryption and
  re-encryption, so a compromised one gives attackers "the keys of the kingdom". Sensor updates
  use CrowdStrike's **zero-touch Linux** capability: auto-update on the appliance with **no
  reboot and no downtime**, and new detections pushed as content updates.
- **Zero trust** is impossible without visibility into the appliances in the path. With Falcon on
  the BIG-IP and on the end hosts, there is end-to-end visibility across each hop.
- **Alert volume.** Falcon's ML plus the **OverWatch** human threat-hunting team distil about
  **7 trillion events per day** into roughly **14 million hunting leads** and about **36,000
  customer notifications** *(as captioned; the timeframe for the last figure is unclear)*.
  Humans hunt for novel tradecraft; ML handles known-bad patterns.
- **NOC/SOC convergence.** Larger customers are merging NetOps and SecOps teams, and the joint
  tooling is meant to alert each side about the other's anomalies. Deeper console integration
  is planned.
- **Offer (in the resources):** complimentary CrowdStrike Falcon sensors for BIG-IP fleets.

---

## Resources (ON24 "Related Content")

The console attaches resources to individual sessions. The four PDFs were downloaded on 18 Sep
2026. They are **not committed** because this repository is public and they are F5 and
third-party copyrighted documents. They are kept alongside the repo in a local archive (see
[How this was captured](#how-this-was-captured)).

| Session | Resource | Type |
|---|---|---|
| Keynote | [Enterprise cybersecurity in a shifting threat landscape](https://www.f5.com/security#overview) | Web page |
| Keynote; Patching; CISOs | [Defend against frontier AI threats at runtime / The frontier AI threat landscape](https://www.f5.com/frontier-ai-defense#threat-landscape) | Web page |
| Keynote | [F5's AI-powered WAF advances virtual patching for the post-Mythos era](https://www.f5.com/company/blog/advance-virtual-patching-with-f5-for-post-mythos-era) | Blog |
| Keynote | [(White paper) Maintaining application resilience when frontier AI outpaces the patch](https://www.f5.com/resources/white-papers/maintaining-application-resilience-in-frontier-llm-era) | White paper |
| Patching | [(Blog) Securing our code with frontier AI: What F5 built and learned](https://www.f5.com/company/blog/securing-our-code-with-frontier-ai-what-f5-built-and-learned) | Blog |
| Patching | [Enterprise application delivery and security reference architecture](https://www.f5.com/resources/reference-architectures/enterprise-application-and-delivery-reference-architecture) | Reference architecture |
| Patching; Agents | [SecureIQLab Cloud WAAP v5.0 CyberRisk Validation Comparative Report](https://interact.f5.com/rs/653-SMC-783/images/Report-Cloud_WAAP_CyberRisk_Validation_Comparative_Report_Final.pdf?version=0) | PDF report |
| WAAP | [2026 State of Application Security Strategy: Can Security Keep Pace with AI?](https://interact.f5.com/rs/653-SMC-783/images/eBook_SOAS-Security-2026.pdf?version=0) | PDF ebook |
| CISOs | [F5 web application and API protection solutions](https://www.f5.com/solutions/web-app-and-api-protection) | Web page |
| AI in Production | [F5 AI Security Platform](https://www.f5.com/products/ai-security-platform) · [AI Guardrails](https://www.f5.com/products/ai-guardrails) · [AI Red Team](https://www.f5.com/products/ai-red-team) · [Workforce AI Security](https://www.f5.com/products/workforce-ai-security) | Product pages |
| AI in Production | *(Report) F5 AI Guardrails: Validated Protection Against Real-World AI Attacks* — SecureIQLab, Aug 2026 | **PDF, ON24-hosted (7.4 MB)** |
| Agents | *(Ebook) Trust in the autonomous age* | **PDF, ON24-hosted (0.4 MB)** |
| Agents | [Distributed Cloud Bot Defense product tour](https://www.f5.com/resources/demos/f5-distributed-cloud-bot-defense-demo) | Demo |
| PQC | [F5 post-quantum cryptography readiness solutions](https://www.f5.com/solutions/post-quantum-cryptography-readiness) | Web page |
| PQC | *(Ebook) PQC Readiness for Dummies* | **PDF, ON24-hosted (3.8 MB)** |
| Blind Spots | [CrowdStrike Falcon sensor support for F5 BIG-IP](https://www.f5.com/partners/technology-alliances/crowdstrike) | Partner page |
| Blind Spots | *(Solution Overview) Deploy the CrowdStrike Falcon sensor on your BIG-IP systems* | **PDF, ON24-hosted (0.3 MB)** |
| Blind Spots | [Request complimentary CrowdStrike Falcon sensors for BIG-IP](https://www.f5.com/go/contact/request-crowdstrike-falcon-sensors-for-big-ip) | Offer form |
| (Hub-wide) | [F5 Labs CASI and ARS Leaderboards](https://www.f5.com/labs/casi) | Web page |

The four **bold** PDFs are hosted inside ON24 and disappear with the library. The rest are
public f5.com and interact.f5.com URLs that should outlive it.

No slide decks are offered. The ON24 player shows video only, with a blank slide placeholder,
and none of the sessions has a downloadable deck.

---

## How this was captured

- **Source.** The ON24 console for event `5460330`, signed in as the registrant on 18 Sep 2026
  and driven with Playwright in a visible Chromium. Metadata came from the console's own JSON
  endpoints: the hub content list (abstracts, related content), the speaker list, and each
  webcast's console data (caption file list, on-demand end offset).
- **Captions.** Each session exposes an English WebVTT track. The keynote and *Securing AI in
  Production* tracks are clean, edited captions. The other six are machine ASR with per-cue
  confidence notes. ON24 also serves auto-translated French, German, Chinese (Simplified) and
  Japanese tracks. These were not collected.
- **Local archive (not in git).** `~/NaughtyFish/f5-security-summit-2026-archive/` holds
  `transcripts/` (plain text, one file per session, about 18,000 words total), `captions-vtt/`
  (the original WebVTT files), `resources/` (the four ON24-hosted PDFs) and `on24-metadata/`
  (the hub JSON). It is kept out of this public repository deliberately. Move it to private
  storage before the Mac is wiped or rebuilt.
- **Not collected:** the video files themselves. ON24 streams them as DASH segments, and a
  12 MB archive of text and PDFs covers what this record needs.
- The one-pager PDF attached to the Awan Distribution email (`F5 Virtual Security Summit_10th
  Sept to 30th Oct.pdf`, Gmail IDs `1a085eda14491b71` / `1a085fd928199bb7`) is still unread. Its
  purpose (fuller session details) is now fully covered by the console capture above.

---

## Recommended action before 30 October

- [x] Open the ON24 console and capture the full agenda — exact titles, abstracts, runtimes
- [x] Record what "post-Mythos" / "Mythos" actually refers to
- [x] Write down the three PQC readiness steps
- [x] Download every available resource from the console (4 PDFs; no slide decks exist)
- [x] Export transcripts/captions (all 8 English tracks)
- [x] Append per-session notes to this document and commit
- [ ] Decide where the local archive (transcripts + PDFs) should live long-term: a private repo, Drive, or SharePoint
- [ ] Optionally download `F5 Virtual Security Summit_10th Sept to 30th Oct.pdf` from Gmail for completeness
- [ ] Brief the team on sessions 2, 3 and 5 against live engagements (see below)
- [ ] Verify the US executive-order number cited in the PQC session before quoting it to a customer

---

## Relevance to current work

This is editorial context, not something the emails assert — but the summit's subject matter
overlaps directly with F5 work in flight during September 2026:

| Summit topic | Related area of active work |
|---|---|
| WAAP for the Post-Mythos World | Advanced WAF deployments; on-prem WAF evaluations |
| Trust in the Age of AI Agents / Bot Defense | API gateway and API discovery requirements |
| Securing AI in Production | F5 AI Insights / AI Assistant evaluation |
| When Patching Isn't Fast Enough | Hardened-release cadence migrations |

Sessions 2, 3 and 5 are the highest-value watches for the team on current engagements.

Two session details bear directly on this work. F5 moved to **hardened releases every six weeks**
in September 2026, and advises treating every one as closing a critical gap (Montoya). That is
the cadence in-flight migrations will have to absorb, and F5 Insight for ADSP is F5's answer to
absorbing it. The **API Security Local Edition** for air-gapped environments (Shah) is directly
relevant to on-prem-only banking requirements.

> **Note.** This repository is public. Specific customer names, deployment details and engagement
> status were deliberately removed from this section. Keep that mapping in the private archive
> alongside the transcripts, not here.

---

## Related F5 announcements — September 2026

Context from the *F5 Partner Connect newsletter — September 2026*, which carried the summit as
its lead item. Useful for understanding what the summit was positioning:

- **F5 AI Security Platform** introduced — continuous visibility, governance and protection for
  AI applications, models, agents and APIs.
- **F5 acquires SurePath AI** — adds network-based AI visibility, intent classification and
  shadow-AI detection to F5's AI security portfolio.
- **F5 named a WAAP leader** in independent WAAP testing for security and efficiency.
- **Next-generation F5 AI Gateway** — for AI cost, security and control.
- **F5 Insight** — AI-powered fleet management for BIG-IP.
- **AI Runtime Security Learning Path** — partner enablement track for F5 AI Runtime Security.
- **Citrix Compete / NetScaler replacement kit** — updated partner marketing kit.

---

## Source emails

All nine messages, in chronological order. Times are UTC.

| # | Date | From | Subject | Gmail ID |
|---|---|---|---|---|
| 1 | 7 Sep, 02:00 | `o.anderson@f5.com` | Announcing the F5 Post-Mythos Security Summit | `1a079988159ab662` |
| 2 | 7 Sep, 07:27 | `ahmer.ghazi@innovativeintegration.net` | Fwd: Announcing the F5 Post-Mythos Security Summit | `1a07ac3f0eef0970` |
| 3 | 9 Sep, 06:01 | `o.anderson@f5.com` | F5 Partner Connect newsletter — September 2026 | `1a084c1928347c40` |
| 4 | 9 Sep, 11:28 | `muhammad.khan@awandistribution.com` | Your App, API and AI risk surface just changed — join F5's Virtual Security Summit today! **(PDF attached)** | `1a085eda14491b71` |
| 5 | 9 Sep, 11:46 | `ahmer.ghazi@innovativeintegration.net` | Fwd: of #4 **(PDF attached)** | `1a085fd928199bb7` |
| 6 | 9 Sep, 12:13 | `o.anderson@f5.com` | You're on the list! F5 Virtual Security Summit reminders *(Add to Calendar)* | `1a086163b0687541` |
| 7 | 10 Sep, 02:00 | `o.anderson@f5.com` | We're LIVE: Security for the post-Mythos world | `1a0890c029b1adbf` |
| 8 | 14 Sep, 02:00 | `o.anderson@f5.com` | Your summit sessions are live. Get started. | `1a09da4d790709ea` |
| 9 | 17 Sep, 15:39 | `o.anderson@f5.com` | You're in! Access your F5 Security Summit on-demand sessions | `1a0b005a522c7263` |

### Contacts

| Role | Name | Contact |
|---|---|---|
| F5 summit mailings | Olivia Anderson | `o.anderson@f5.com` |
| Distributor — registration and summit queries | Muhammad Ahmed Khan, Channel Account Manager, Awan Distribution | `muhammad.khan@awandistribution.com` |
| Internal forwarder | Ahmer Ghazi | `ahmer.ghazi@innovativeintegration.net` |
