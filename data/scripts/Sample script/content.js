function beforeRender(req, res, done) {
  //you can use a server side running script to load remote data
  //or do other template preprocessing
  //http://jsreport.net/learn/scripts
  if (typeof  req.data.responseHeader.params.fq === 'string'){
 req.data.responseHeader.params.fq=[];
  req.data.responseHeader.params.fq.push(" ");
  req.data.responseHeader.params.fq.push(" ");
  //
}  else if(req.data.responseHeader.params.fq.length==2){
     req.data.responseHeader.params.fq=req.data.responseHeader.params.fq.splice(0,1);
  if(req.data.responseHeader.params.fq[0].includes("add_country")){
  req.data.responseHeader.params.fq.push("");
  req.data.responseHeader.params.fq.reverse();
  
  } 
} else if(req.data.responseHeader.params.fq.length==3){
     //req.data.responseHeader.params.fq=req.data.responseHeader.params.fq.splice(-1,2);

}
 
  req.data.generatedOn = new Date();
  done();
}