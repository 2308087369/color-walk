# Color City API 说明文档

本文档详细介绍了 Color City 项目提供的所有后端 API 接口。由于项目基于 FastAPI 构建，您也可以通过访问 `http://127.0.0.1:8000/docs` 查看交互式 Swagger UI 文档。

---

## 1. 基础说明

- **Base URL**: `http://127.0.0.1:8000`
- **鉴权方式**: Bearer Token (JWT)。部分接口需要在请求头中携带 `Authorization: Bearer <your_token>`。
- **数据格式**: 请求和响应默认使用 `application/json`（文件上传及登录接口除外）。

---

## 2. 用户路由 (Users)

用户路由主要用于账户的注册、登录以及个人信息的管理。

### 2.1 用户注册
- **URL**: `/users/register`
- **Method**: `POST`
- **描述**: 创建一个新用户。
- **请求体 (JSON)**:
  ```json
  {
    "username": "testuser",
    "password": "testpassword"
  }
  ```
- **成功响应 (200 OK)**:
  ```json
  {
    "username": "testuser",
    "id": 1,
    "created_at": "2023-10-27T10:00:00",
    "updated_at": "2023-10-27T10:00:00"
  }
  ```
- **错误响应**: `400 Bad Request` (如果用户名已被注册)。

### 2.2 用户登录
- **URL**: `/users/login`
- **Method**: `POST`
- **描述**: 验证用户凭据并返回访问令牌 (Access Token)。
- **请求体 (Form-Data)**:
  - `username` (string): 用户名
  - `password` (string): 密码
- **成功响应 (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR...",
    "token_type": "bearer"
  }
  ```
- **错误响应**: `401 Unauthorized` (如果用户名或密码不正确)。

### 2.3 获取当前用户信息
- **URL**: `/users/me`
- **Method**: `GET`
- **描述**: 获取当前已登录用户的信息。
- **请求头**: `Authorization: Bearer <token>`
- **成功响应 (200 OK)**:
  ```json
  {
    "username": "testuser",
    "id": 1,
    "created_at": "2023-10-27T10:00:00",
    "updated_at": "2023-10-27T10:00:00"
  }
  ```
- **错误响应**: `401 Unauthorized` (如果 Token 无效或未提供)。

### 2.4 修改当前用户信息
- **URL**: `/users/me`
- **Method**: `PUT`
- **描述**: 修改当前登录用户的信息（如更新密码）。
- **请求头**: `Authorization: Bearer <token>`
- **请求体 (JSON)**:
  ```json
  {
    "password": "new_secure_password"
  }
  ```
- **成功响应 (200 OK)**: 返回更新后的用户信息。

---

## 3. 颜色路由 (Colors)

颜色路由用于获取数据库中存储的中国传统颜色信息，以及进行随机抽奖和图像颜色检测。

### 3.1 分页获取颜色列表
- **URL**: `/colors/`
- **Method**: `GET`
- **描述**: 按分页获取颜色数据列表。
- **查询参数 (Query Parameters)**:
  - `page` (integer): 当前页码，默认 `1`（必须 >= 1）。
  - `size` (integer): 每页返回的数量，默认 `20`（范围 1~100）。
- **成功响应 (200 OK)**:
  ```json
  {
    "total": 759,
    "page": 1,
    "size": 20,
    "items": [
      {
        "name": "红色",
        "hex_code": "#FF0000",
        "id": 1,
        "created_at": "2023-10-27T10:00:00",
        "updated_at": "2023-10-27T10:00:00",
        "created_by": "system"
      }
      // ... 更多颜色
    ]
  }
  ```

### 3.2 随机抽取颜色
- **URL**: `/colors/random`
- **Method**: `POST`
- **描述**: 随机抽取指定数量的颜色，可用于抽奖功能，并支持排除特定 ID 的颜色。
- **请求体 (JSON)**:
  ```json
  {
    "count": 3,
    "exclude_ids": [1, 5, 10]
  }
  ```
  - `count`: 需要抽取的颜色数量（默认 1）。
  - `exclude_ids`: (可选) 不希望被抽到的颜色 ID 列表。
- **成功响应 (200 OK)**:
  返回被抽中的颜色列表：
  ```json
  [
    {
      "name": "天青色",
      "hex_code": "#426ab3",
      "id": 120,
      "created_at": "2023-10-27T10:00:00",
      "updated_at": "2023-10-27T10:00:00",
      "created_by": "system"
    },
    // ...
  ]
  ```
- **错误响应**: `400 Bad Request` (如果请求数量大于可用颜色数量，或数量 < 1)。

### 3.3 图像颜色检测
- **URL**: `/colors/detect`
- **Method**: `POST`
- **描述**: 上传一张图片，并检测该图片中是否包含指定的颜色。
- **请求数据格式**: `multipart/form-data`
- **请求字段**:
  - `color_id` (integer, 必填): 数据库中目标颜色的 ID。
  - `tolerance` (integer, 可选): RGB 欧氏距离容差，默认值为 `30`。值越大，对颜色的匹配越宽松。
  - `file` (file, 必填): 需要检测的图像文件（例如 .jpg, .png）。
- **成功响应 (200 OK)**:
  ```json
  {
    "color": {
      "name": "红色",
      "hex_code": "#FF0000",
      "id": 1,
      "created_at": "2023-10-27T10:00:00",
      "updated_at": "2023-10-27T10:00:00",
      "created_by": "system"
    },
    "found": true,
    "percentage": 22.92,
    "matching_pixels": 2292,
    "total_pixels": 10000
  }
  ```
  - `found`: 布尔值，指示是否在图片中找到了符合容差的颜色。
  - `percentage`: 匹配的像素占图片总像素的百分比。
  - `matching_pixels`: 匹配到的像素数量。
  - `total_pixels`: 图片的总像素数量。
- **错误响应**:
  - `400 Bad Request` (如果文件不是图像或图像格式无效)。
  - `404 Not Found` (如果指定的 `color_id` 不存在)。
