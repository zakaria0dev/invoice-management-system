import bcrypt from 'bcrypt';

const password = 'demo123';
const hash = '$2b$12$156IJi.os9oqKyjiY8VzHudhmPttEtU8PBsq9/ZNoNoYNXZzn9kIS';

bcrypt.compare(password, hash, (err, result) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log('Password match:', result);
});
