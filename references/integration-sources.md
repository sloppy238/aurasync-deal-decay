# Salesforce + Gmail integration references

## Gmail

- Official scope guide: https://developers.google.com/workspace/gmail/api/auth/scopes
- Official message format reference: https://developers.google.com/workspace/gmail/api/reference/rest/v1/Format
- The `https://www.googleapis.com/auth/gmail.metadata` scope is restricted and provides email metadata such as labels and headers, but not the email body.
- With Gmail API `format=metadata`, the response contains message ID, labels, and email headers. `full` and `raw` formats are incompatible with the `gmail.metadata` scope and expose content, so AuraSync must not request them.
- The official guide recommends choosing the narrowest scope possible and notes that restricted scopes have additional verification/security-assessment implications if restricted data is stored or transmitted.

## Salesforce

- Official OAuth web-server flow: https://help.salesforce.com/s/articleView?language=en_US&id=xcloud.remoteaccess_oauth_web_server_flow.htm&type=5
- Official REST query reference: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
- Salesforce's official guidance describes the web-server authorization-code flow for an external web app, recommends PKCE, and requires a callback URL registered in the external client app. Scope values should be limited to the subset of registered permissions that the app actually needs.
- AuraSync's safe CSV contract only accepts opportunity/contact-role metadata: `opportunity_id`, `opportunity_name`, `account_name`, `stage`, `owner_email`, `amount`, `close_date`, `contact_id`, and `contact_role`.

## AuraSync boundary decision

The easier setup selected for the current milestone is local CSV import. Files are parsed locally in the browser, content-bearing headers are rejected before staging, and only a validation summary is sent to the server. The server staging procedure accepts only source, columns, and row counts; it does not accept raw CSV rows, message bodies, subjects, attachments, transcripts, recordings, or semantic summaries.

The uploaded reference file included a Google authorization code and broader OAuth guidance. That code is intentionally not used or stored. If it was real, it should be revoked and replaced with a fresh provider authorization flow.
