var http = require('http'); //http 모듈(http, 웹 서버 생성)
var fs = require('fs'); //fs 모듈(FileSystem, 파일 처리 관련 모듈)
var url = require('url'); //url 모듈(url 관련 정보 가져올 수 있음)
var qs = require('querystring'); //querystring 모듈(url 객체의 query와 관련된 모듈)
var path = require('path'); //Path 모듈은 파일과 Directory 경로 작업을 위한 Utility를 제공
var sanitizeHtml = require('sanitize-html'); //악성스크립트로 변질되는 것을 막아주는 보안 라이브러리

var template = {
//객체를 이용한 템플릿 기능 정리 정돈
  HTML:function(title, list, body, update){
    return `
    <!doctype html>
    <html>
    <head>
      <title>WEB - ${title}</title>
      <meta charset="utf-8">
    </head>
    <body>
      <h1><a href="/">WEB</a></h1>
      ${list}
      ${update}
      ${body}
    </body>
    </html>
    `;
  },
  List:function(filelist){
    var list = '<ul>';
    var i = 0;
    while(i < filelist.length){
    list = list + `<li><a href="/?id=${filelist[i]}">${filelist[i]}</a></li>`;
    i = i + 1;
    }
    list = list+'</ul>';
    return list;
  }
}
//module.exports = template; 를 사용하여 모듈을 export할수 있다.

var app = http.createServer(function(request,response){
//request는 사용자가 주소를 입력할 때, response는 클라이언트에 요청 받은 값을 출력해줌
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var pathname = url.parse(_url, true).pathname;
    //true는 url객체의 query 속성을 객체 형식, false는 문자열 형식으로 가져옴
    //query 객체란 querystring을 의미하며, url 중에서 '?' 뒷부분을 의미
    if(pathname === '/'){
      if(queryData.id === undefined){
        fs.readdir('./data', function(error, filelist){
          var title = 'Welcome';
          var description = 'Hello, Node.js';
          var list = template.List(filelist);
          var html = template.HTML(title, list,
            `<h2>${title}</h2>${description}`,
            `<a href="/create">create</a>`);
          response.writeHead(200);
          //100번대:정보응답, 200번대:성공응답, 300번대:리다이렉션(URI 변경), 400번대:클라이언트 에러, 500번대:서버에러
          response.end(html);
        })
      } else {
        fs.readdir('./data', function(error, filelist){
        var list = template.List(filelist);
          var filteredId = path.parse(queryData.id).base;
          //base로 함으로써 경로세탁, 하위디렉토리 확인못하게하는 역할
          fs.readFile(`data/${filteredId}`, 'utf8', function(err, description){
            var title = queryData.id;
            var sanitizedTitle = sanitizeHtml(title);
            var sanitizedDescription = sanitizeHtml(description);
            var html = template.HTML(sanitizedTitle, list,
              `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
              `<a href="/create">create</a>
               <a href="/update?id=${sanitizedTitle}">update</a>
               <form action="process_delete" method="post">
                <input type="hidden" name="id" value="${sanitizedTitle}">
                <input type="submit" value="delete">
               </form>
               `);
              //delete의 경우 링크로 하면 안된다.
            response.writeHead(200);
            response.end(html);
          });
        });
      }

    } else if(pathname === '/create') {
      fs.readdir('./data', function(error, filelist){
        var title = 'WEB - create';
        var list = template.List(filelist);
        var html = template.HTML(title, list, `
        <form action="/process_create" method="post">
          <p><input type="text" name="title" placeholder="title
          "></p>
          <p>
            <textarea name="description" placeholder="description
            "></textarea>
          </p>
          <p>
            <input type="submit">
          </p>
        </form>        
        `, '');
        response.writeHead(200);
        response.end(html);
      })
    } else if(pathname === '/process_create') {
        var body = '';
        request.on('data', function(data){
        //request로 들어온 데이터를 콜백함수의 data 인자값으로 일정 기준으로 조각내서 넣어준다는 뜻입니다. 조각을 내서 넣어주기때문에 전부 다 받으려고 body += data 를 넣어줍니다.
          body = body + data;
        });
        request.on('end', function(){
        //request 데이터를 다 받고나서 작동한다. body 에 request 받은 모든데이터를 querystring 형식으로 바꿔서 다시 post로 담음
          var post = qs.parse(body);
          //console.long(post); 라는 코드를 입력해서 확인해보자
          var title = post.title;
          var description = post.description;
          fs.writeFile(`data/${title}`, description, 'utf8', function(err){
            response.writeHead(302,{Location: `/?id=${title}`});
            response.end();
          })
        });
    } else if(pathname === '/update') {
      fs.readdir('./data', function(error, filelist){
        var list = template.List(filelist);
          var filteredId = path.parse(queryData.id).base;
          fs.readFile(`data/${filteredId}`, 'utf8', function(err, description){
            var title = queryData.id;
            var html = template.HTML(title, list,
              //사용자가 수정하는 정보와 수정할 파일의 이름을 구분해야함
              `
              <form action="/process_update" method="post">
                <input type="hidden" name="id" value="${title}">
                <p><input type="text" name="title" placeholder="title
                " value="${title}"></p>
                <p>
                  <textarea name="description" placeholder="description"
                  ">${description}</textarea>
                </p>
                <p>
                  <input type="submit">
                </p>
              </form>
              `,
              `<a href="/create">create</a> <a href="/update?id=${title}">update</a>`);
            response.writeHead(200);
            response.end(html);
          });
        });
    } else if(pathname === '/process_update') {
      var body = '';
      request.on('data', function(data){
        body = body + data;
      });
      request.on('end', function(){
        var post = qs.parse(body);
        var id = post.id;
        var title = post.title;
        var description = post.description;
        fs.rename(`data/${id}`, `data/${title}`, function(err){
          fs.writeFile(`data/${title}`, description, 'utf8', function(err){
            response.writeHead(302,{Location: `/?id=${title}`});
            response.end();
          })
        })
      });
    }  else if(pathname === '/process_delete') {
      var body = '';
      request.on('data', function(data){
        body = body + data;
      });
      request.on('end', function(){
        var post = qs.parse(body);
        var id = post.id;
        var filteredId = path.parse(id).base;
        fs.unlink(`data/${filteredId}`, function(err){
          response.writeHead(302,{Location: `/`});
          response.end();
        })
      });
    }

    else {
      response.writeHead(404);
      response.end('Not found');
    }
});
app.listen(3000);