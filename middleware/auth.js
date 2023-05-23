import jwt from "jsonwebtoken";
export default function (req, res, next) {
  // console.log("calling");
  // const token = localStorage.token
  //     if(!req.headers['authorization']){
  //         console.log("no token")

  //     }else
  //     {
  //     const authHeader = req.headers['authorization']
  //     const split = authHeader && authHeader.split(" ")[1]
  //     const token = split.replaceAll('"', '');
  //     console.log(token)
  //     if(token == null ) {
  //         return
  //     }
  //     else{
  //     const decoded = jwt.verify(token, process.env.SECRET_KEY)
  //     if(User.findOne({email :decoded.email})){
  //         next()
  //     }
  //     else logout
  // }
  // }
  const authHeader = req.headers["authorization"];
  if (authHeader) {
    const split = authHeader && authHeader.split(" ")[1];
    const token = split.replaceAll('"', "");
    jwt.verify(token, process.env.SECRET_KEY, (err, valid) => {
      if (err) {
        res.status(401).send({ result: "Provide valid token" });
      } else {
        next();
      }
    });
  } else {
    res.status(403).send({ result: "No token found" });
  }
}
