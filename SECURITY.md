# Security Policy

Umbrista is a design and portfolio project: the café is fictional. Its forms do save real
data, though, so security reports are genuinely welcome.

## Supported versions

Only the current `main` branch is maintained. Until v1.0.0 there are no releases.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Use GitHub's private vulnerability reporting: open the **Security** tab of this repository and
choose **Report a vulnerability**. No email address is published for reports.

Useful reports name the affected page, endpoint or file, what an attacker can achieve, and the
steps to reproduce. A working proof of concept helps but is not required.

This is a personal project, so there is no guaranteed response time, no formal
disclosure timeline and no bug bounty.

## Scope

In scope is everything in this repository: the web app, the serverless functions, the database
migrations, and the CI workflows.

Out of scope are findings that depend on sample configuration being used as is (for example the
placeholder values in `.env.example`) and the demo staff view's deliberate "Try the staff view"
entrance, which only reaches invented demo data.

## Personal data

If you believe personal data of yours is stored, or want it deleted, that is a data request, not
a vulnerability: use the "Data request" issue template, and put no names, emails or phone
numbers in the issue.
