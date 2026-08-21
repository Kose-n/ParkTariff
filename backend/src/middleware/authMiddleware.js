import jwt from 'jsonwebtoken';

export const protect = (req, res, next) =>  {
      // Authorization header format: 'Bearer eyJhbGci...'
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer')){
        return res.status(401).json({message:'NO token provided'});
    }
    
    const token = authHeader.split(' ')[1];
      // Splits 'Bearer eyJhbGci...' into ['Bearer', 'eyJhbGci...']
  // and takes the second element

    
    try {
        const decoded =jwt.verify(token, process.env.JWT_SECRET);
            // jwt.verify throws an error if:
    //   - token is tampered with
    //   - token is expired
    //   - secret doesn't match
        req.user = decoded;
        // decoded = { id: 'uuid', role: 'ADMIN', iat: ..., exp: ... }
        // Now any route handler can read req.user.id or req.user.role

        next();
  }     catch (err) {
    return res.status(401).json({ message:"Invalid or expired token"});
  }
};
