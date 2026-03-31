---
alwaysApply: false
description: 修改编辑python代码时生效
---
本项目后端使用python3.13的虚拟环境.venv，利用uv pip管理依赖（可以参考uv pip install pandas，安装所需依赖）
目录说明：
1. routers存放后端路由，按功能划分路由，创建或修改路由后需要使用测试脚本进行测试
2. utils存放公共/工具函数，尽量不在routers中定义工具函数
3. scripts存放各类脚本文件和临时python脚本
4. tests存放路由/接口测试脚本，用来测试路由/接口的功能
5. 数据库采用WAL模式的SQLITES，保证并发和读取性能，数据库db初始化在data目录下，数据库的表结构也应该定义在data目录下命名为model.py
6. 