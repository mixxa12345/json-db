const findId = (collection, id) => {
    const low = require('lowdb');
    const FileSync = require('lowdb/adapters/FileSync');
    const adapter = new FileSync('db.json');
    const db = low(adapter);
    const item = db.get(collection)
        .find({ id: id })
        .value();
    console.log(`FOUND [${id}] IN [${collection}], RETURN [${item.uid}]`);
    return item.uid;
};
const block = (key, id) => {
    return key !== id
};
const findPushKey = (id) => {
    const low = require('lowdb');
    const FileSync = require('lowdb/adapters/FileSync');
    const adapter = new FileSync('db.json');
    const db = low(adapter);
    const item = db.get('users')
        .find({ id: id })
        .value();
    return item ? item.push_token : false;
};
const notify = (body) => {
    const to = findPushKey(body.to);
    console.log(body.to, to);
    if (to) {
        const fetch = require("node-fetch");
        fetch( 'https://exp.host/--/api/v2/push/send',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: to,
                title: 'Mailbox',
                body: body.body,
            }),
        });
    }
};

// allow GET
// guard POST [key: POST_KEY]
// guard PATCH, PUT, DELETE [key: item.user_id]
module.exports = (req, res, next) => {
    let blocked = false;
    let sent = false;
    if (req.method !== 'GET') {
        const POST_KEY = 'atXl4BvzAatlK9dFj8fWqGqUtTUhGw69NPBWu8VyJEF9eF4UTmgz4SIkK3gJCYkOuLydsLR0WxYsCPIP3LPAWjkX6jnlFRo8ea9e';
        const noKey = 'NOT_FOUND_KEY';
        const key = req.headers.key || noKey;
        const resource = (req.path).split('/'); //['', path, :id]
        const collection = resource[1];
        const child_id = resource[2];
        //check {key: POST_KEY}
        if (req.method === 'POST') {
            if (key===noKey || key!==POST_KEY) {
                blocked = true;
            } else {
                req.body.createAt = new Date();
                if (collection==='requests') {
                    notify(req.body);
                    sent = true;
                    res.sendStatus(200);
                }
            }
        }
        //check {key: uid}
        else {
            if (key === noKey) {
                blocked = true;
            } else {
                //key <match> owner-id
                //prevent singular-route-error
                if (resource.length === 3) {
                    const id = collection==='users' ? parseInt(child_id) : findId(collection, parseInt(child_id));
                    blocked = block(parseInt(key), id);
                    console.log(`${key}:${id} <${blocked ? 'block' : 'pass'}>`);
                }
            }
            if (!blocked) {
                if (req.method==='PATCH' || req.method==='PUT') {
                    req.body.updateAt = new Date();
                }
            }
        }
    }

    if (blocked) {
        res.sendStatus(403);
    } else {
        !sent && next()
    }
};
