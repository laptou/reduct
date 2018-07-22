To build the docs:

```
npm install -g jsdoc
# Make sure jsdoc is on your PATH (platform-dependent)
# From docs/:
virtualenv -p python3 venv
source venv/bin/activate
pip install -r requirements.txt
make html
```
