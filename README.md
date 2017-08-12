# egret-protobuf

创建Node.js TypeScript后端项目，里面包含了protobuf版本3、egret项目、前后端WebSocket。

1、安装Node.js扩展，支持TypeScript语法
   npm install -g typescript

2、创建项目目录project_folder，为项目的*.ts添加API代码提示
　　mkdir project_folder
　　cd project_folder
   npm install --save-dev @types/node　　//Node.js的基础API代码提示
   npm install --save-dev @types/ws　　//为ws模块(ws module:WebSocket-https://github.com/websockets/ws)添加API代码提示

3、跳转到项目的目录下，创建Node.js TypeScript项目
　　cd project_folder
   npm init

4、在项目的目录下，创建TypeScript项目配制文件，使用tsc --init，就会自动建立好一份tsconfig.json。
　　cd project_folder
　　tsc --init

5、在项目的目录下，使用tsc编绎tsconfig.json配制下的所有*.td文件成*.js文件。
　　cd project_folder
　　tsc .
