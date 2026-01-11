import { z } from 'zod'

const sanitize = (str) => str.replace(/<\/?[^>]+(>|$)/g, ""); // Remove HTML tags

export const userSchema = z.object({
    email: z.string().email().min(3).max(20).transform(sanitize),
    password: z.string().transform(sanitize)

})

