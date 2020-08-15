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
- `npm run dist`: The server does not automatically compile the client in
  production mode, so we must compile it manually before starting the server.
- `cd ../server`
- `npm run serve`
