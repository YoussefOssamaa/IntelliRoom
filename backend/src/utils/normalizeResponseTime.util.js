import bcrypt from "bcryptjs";
import crypto from 'crypto';

export const normalizeResponseTime = async () => {
    const dummy1 = crypto.randomBytes(parseInt(Math.random() * crypto.randomInt(100,10000))).toString('hex');
    const dummyHash = "$2b$10$nOuIs5kJ7naTuTFkBy1veuK0kS.pSBy8U0J9pWIGB17EDpS.S06G6";
    try{
        await bcrypt.compare(dummy1, dummyHash);
    }catch(e){}

}