# `@reduct/server`
<small>v7.0.6-alpha</small>

This is the server for Reduct. It handles logging the players' actions and
verifying their identities as Cornell students.

## How to run this
- Follow the instructions in the `README.md` at the base of this repo.

## How to run this in production mode
Since the server sends logs to Google Cloud in production mode, you must set up
an environment where you are authenticated to send logs to Google Cloud. **This
is only for when you are testing the production mode on your computer, not for
when you are deploying the application.**

- Make sure you have access to the `reduct-285602` project on Google Cloud. If
  you don't, ping Ibiyemi Abiodun (iaa34).
- Install the [Google Cloud SDK](https://cloud.google.com/sdk/docs#install_the_latest_cloud_tools_version_cloudsdk_current_version).
- `cd server`
- `gcloud auth application-default login`: This will prompt you to log into your
  Google Account. It will generate credentials representing your account and
  store them on your computer in a place where the server can find them.
- `export NODE_ENV=production`: This will tell the server to run in production mode.
- `cd ../client`
- `yarn run dist`: The server does not automatically compile the client in
  production mode, so we must compile it manually before starting the server.
- `cd ../server`
- `yarn run serve`

## Important environment variables that affect execution
- `NODE_ENV`: if this variable is present and equal to `development`, the server
  will operate in dev mode. Otherwise, it will operate in production mode.
- `REDUCT_REMOTE_LOGGING`: defaults to `true` in production mode and `false` in
  development mode. Controls whether logs of the server's activity are uploaded
  to Google Cloud.
- `REDUCT_USE_HTTPS`: controls whether the server should operate in HTTPS mode.
  **When deploying to App Engine, this should not be set to `true` because HTTPS
  is handled by App Engine's built in proxy.**
- `REDUCT_SAML_META`: if set to `true`, the server will generate a new `idp.xml`
  file when it starts, containing up-to-date IdP metadata for the SAML service
  provider.
- `REDUCT_NO_AUTH`: if set to `true`, the server will not require users to log
  in before they can access the game.
- `REDUCT_PROD_AUTH`: if set to `true`, the server will redirect users to the
  production instance of CUWebAuth instead of the testing instance.
