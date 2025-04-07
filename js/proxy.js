/** 
*  proxy.js 
* 
*  front end to PHP class file proxy 
* 
*  @category Service 
*  @package  TB5
*  @author   Sal
*  @license  Doublestruck Ltd. 
*  @version
*  @file
*  @link     
*/ 
	
	var proxyPath = "/data/proxy.php";      

	/*
	className =   the name of the PHP class to call
	methodName =  the name of the function within the class
	typeName =    the return type of json, html or text 
	paramsArray = an array of the parameters for the method, in order. 
	callback =    a function to call with the returned data as argument
	hideSpinner = boolean, optional, true = the ajax wait image will NOT be shown, default false
	*/
	
	
	function getCdnContent(subject, qid, callback) 
	{

		qid = qid.split('.').join("");
	
	
	   //var cdnPath = "http://tcontent.alfiesoftlimited.netdna-cdn.com/alfie/ks3ma/content/questions/help.xml";
	   //var cdnPath = "http://tb5cdn.doublestruck.eu/cache/"  + subject + "/" +  subject + "_" + qid + ".json";
	   //var cdnPath = "https://tb.content.store.s3.amazonaws.com/" + subject + "/" +  subject + "_" + qid + ".json";
	    var cdnPath = "http://s3.eu-west-2.amazonaws.com/tb.content.store/" + subject + "/" +  subject + "_" + qid + ".json";
		
		console.log(cdnPath);
		
			var request = $.ajax({
			  url: cdnPath,
			  type: "GET",
			  }).
			  done(function(data) {
				if(callback) {
						callback(JSON.parse(data));
				 }		
			}).always(function() {
				
					$("#loading").fadeOut("fast");
				
			}).fail(function(ev) {
			    
			   if(ev.status != 200) {
			     
			     try {
                     log(launched_subject, "SESSION", ev.status +  "|" + className + ' - ' + methodName);
      	 	      }
      	 	      catch(e) {};
      		    
			    }
			    else {
			     
			   	   log(launched_subject, "DATAERROR", "GET - " + ev.status +  "|" + className + ' - ' + methodName);
			       vex.dialog.alert("Sorry, your request could not be processed. Please try again.");   
			        
			    }
			
			});	
	}
	
	
	function get(className, methodName, typeName, paramsArray, callback, hideSpinner) 
	{
		
    	  if(paramsArray) {
    	       $.each(paramsArray, function(x) {
    	          paramsArray[x] = encodeURIComponent(paramsArray[x]);
    	       });   
    	  }
    	
    	  if(!launched_subject) var launched_subject = "Global";
          if(!hideSpinner)  $("#loading").fadeIn("fast");
    	
    		req = {};
    		req.classname = className;     
    		req.method = methodName;
    		req.params = paramsArray;         
    		req.type = typeName;
    		
    		
    			var request = $.ajax({
    			  url: proxyPath,
    			  type: "GET",
    			  data: "p=" + JSON.stringify(req), 
    			  processData: false,
    			   headers : {
                        "X-Req-Number" : reqid
                   }
    			  }).
    			  done(function(data) {
                    reqid = request.getResponseHeader('X-Req-Number');
    				if(callback) {
    						callback(data);
    				 }		
    			}).always(function() {
    				
    					$("#loading").fadeOut("fast");
    				
    			}).fail(function(ev) {
    			    
    			   if(ev.status == 403) {
    			     
    			     try {
                         log(launched_subject, "SESSION", ev.status +  "|" + className + ' - ' + methodName);
          	 	      }
          	 	      catch(e) {};
          	 	      
          	 	      document.location.href = "/login.php?l=1&br=" + launched_theme;
          	 	    }
    			    else {
    			     
    			   	   log(launched_subject, "DATAERROR", "GET - " + ev.status +  "|" + className + ' - ' + methodName);
    			        
    			    }
    			
    			});	
	}

	function post(className, methodName, typeName, paramsArray, callback, hideSpinner) 
	{
	
	    if(!hideSpinner)  $("#loading").fadeIn("fast");
	
		req = {};
		req.classname = className;     
		req.method = methodName;
		req.params = paramsArray;         
		req.type = typeName;
		
			var request = $.ajax({
			  url: proxyPath,
			  type: "POST",
			  data: JSON.stringify(req), 
			  processData: false,
			  headers : {
                    "X-Req-Number" : reqid
               }
			  }).
			  done(function(data) {
			    reqid = request.getResponseHeader('X-Req-Number');
       		    if(callback) {
						callback(data);
				 }		
			}).always(function() {
				
					$("#loading").hide();
				
			}).fail(function(ev) {
                
               if(ev.status == 403) {
                 document.location.href = "/login.php?l=1&br=" + launched_theme;
                }
               else {
                 
                 log(launched_subject, "DATAERROR", "POST - " + ev.status +  "|" + className + ' - ' + methodName);
                 vex.dialog.alert("Sorry, your request could not be processed. Please try again.");   
                    
                }
            
            });	
	}
	
	
	String.prototype.escapeChars = function() 
	{
        if(this) {
        return this.replace(/\\n/g, "\\n")
                   .replace(/\\'/g, "\\'")
                   .replace(/\\"/g, '\\"')
                   .replace(/\\&/g, "\\&")
                   .replace(/\\r/g, "\\r")
                   .replace(/\\t/g, "\\t")
                   .replace(/\\b/g, "\\b")
                   .replace(/\\f/g, "\\f");
        } else { return "" }
               
    }
