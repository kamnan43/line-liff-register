# line-liff-register
CLI Tool to help register/update LINE LIFF apps

## How it work
This CLI read LIFF configulation from JSON file and make request(s) to LINE API to generate/update LIFF apps automatically.

## Install
Clone and run
```
npm install
```

## Create a config file
Create a JSON file in following format and then named as `config.json` or something.
```json
{
  "channelAccessToken": "YOUR_CHANNEL_ACCESS_TOKEN",
  "baseUrl": "https://yourhostname.com",
  "apps": [
    {
      "name": "Name1",
      "type" : "full",
      "url": "/pathto/endpoint",
    },
    {
      "name": "Name2",
      "type" : "tall",
      "url": "/path/to/endpoint",
    }
  ],
  "deleteUnUseApp": true
}
```

## Definitions
**channelAccessToken** : channel access token from LINE console

**baseUrl** : your hostname with https

**apps** : LIFF apps that want to register/update
- **name** : something you want
- **type** : LIFF type
- **url** : path to your endpoint url (not include hostname)

**deleteUnUseApp** : remove apps that already registered but in in config file.

## How to use
```
node index.js config.json
```
## Result
```
LIFF apps register started
1/3 - get LIFF apps that has registered to LINE ... found 2 apps
2/3 - delete LIFF apps that does not in config file ...
      done
3/3 - add or modify LIFF apps to LINE ...
configApps [
   {
     "name": "Shopping",
     "type": "full",
     "url": "/abcshop/explore",
     "liffId": "1604427777-xxxxxxxx"
   },
   {
     "name": "Register Store",
     "type": "full",
     "url": "/abcshop/store/register",
     "liffId": "1604427777-xxxxxxxx"
   }
]
```
## Author
Sitthi Thiammekha
