# egret-protobuf

创建Node.js TypeScript后端项目，里面包含了protobuf版本3、egret项目、前后端WebSocket。


1、安装Node.js扩展，支持TypeScript语法

npm install -g typescript

2、创建项目目录project_folder，为项目的*.ts添加API代码提示

　　mkdir project_folder

　　cd project_folder

3、跳转到项目的目录下，创建Node.js TypeScript项目

　　cd project_folder

npm init

4、在项目的目录下，创建TypeScript项目配制文件，使用tsc --init，就会自动建立好一份tsconfig.json。

　　cd project_folder

　　tsc --init

　　tsconfig.json的参数详情链接：中文、英文（官网）　



　　tsconfig.json特殊符号：

* 匹配0或多个字符（不包括目录分隔符）

? 匹配一个任意字符（不包括目录分隔符）

**/ 递归匹配任意子目录

 　　

5、在项目的目录下，使用tsc编绎tsconfig.json配制下的所有*.td文件成*.js文件。

　　cd project_folder

　　tsc --rootDir src --outDir dist



　　在WebStorm中，可以设置如下，实现自动编译：

　　File->Default Settings...->Language & Frameworks->TypeScript

　　里面Compiler->Enable Typescript Compiler->Use tsconfig.json

6、为项目的*.ts添加API代码提示

cd project_folder

npm install --save-dev @types/node　　//Node.js的基础API代码提示

npm install --save-dev @types/ws　　//为ws模块(ws module:WebSocket)添加API代码提示

也可以用以下方法：

npm install --save-dev typescript @types/node @types/ws @types/express
