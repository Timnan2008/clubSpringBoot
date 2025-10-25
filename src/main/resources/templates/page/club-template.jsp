<%
    System.out.println("hello");
%>

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>编程社团介绍</title>
    <link rel="stylesheet" href="../../other/all style.css">
    <style>
        *{
            margin: 0;
            padding: 0;
            list-style: none;
            text-decoration: none;
        }
        .navbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: white;
            margin: 0;
            padding: 10px 30px;
            height: 100px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            position: sticky;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
        }
        .navbar-top {
            display: flex;
            align-items: center;
            width: 100%;
        }
        .navbar-left {
            display: flex;
            align-items: center;
        }
        .navbar-logo {
            height: 100px;
            margin-right: 16px;

        }
        .school-name-block {
            display: flex;
            flex-direction: column;
            line-height: 1.2;
        }
        .school-cn {
            font-size: 18px;
            font-weight: bold;
            color: #444;
        }
        .school-en {
            font-size: 12px;
            color: #777;
            text-transform: uppercase;
        }
        .navbar-links {
            display: flex;
            margin-left: auto;
        }
        .navbar-links a {
            margin-left: 20px;
            text-decoration: none;
            color: #242525;
            font-weight: 500;
            transition: color 0.3s;
        }
        .navbar-links a:hover {
            color: #0056b3;
        }
        .dropdown {
            position: relative;
            display: inline-block;
        }
        .dropbtn {
            padding: 10px;
            color: #242525;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            transition: color 0.3s;
        }
        .dropbtn:hover {
            color: #0056b3;
        }
        .dropdown-content {
            display: none;
            position: absolute;
            background-color: white;
            min-width: 180px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
            z-index: 1001;
            border-radius: 8px;
            overflow: hidden;
            top: 100%;
            left: 0;
        }
        .dropdown-content a {
            color: #242525;
            padding: 12px 16px;
            text-decoration: none;
            display: block;
            font-size: 14px;
            transition: background-color 0.2s, color 0.2s;
        }
        .dropdown-content a:hover {
            background-color: #f0f0f0;
            color: #007bff;
        }
        .dropdown:hover .dropdown-content {
            display: block;
        }
        .top-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 20px 0;
        }
        .leaders {
            flex: 1;
        }
        .club-logo {
            width: 120px;
            height: auto;
            margin-left: 20px;
            border-radius: 8px;
        }
        .photo-horizon {
            width: 99%;
        }
        .photo-verticle {
            width: 49%;
        }

        .video-section {
            margin-top: 40px;
            text-align: center;
        }
        .video-container {
            position: relative;
            display: inline-block;
            width: 100%;
            max-width: 720px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .like-overlay {
            position: absolute;
            bottom: 10px;
            right: 20px;
            background: rgba(255, 255, 255, 0.85);
            border-radius: 50px;
            padding: 6px 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 18px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        #likeBtn {
            background: none;
            border: none;
            color: #ff5252;
            font-size: 22px;
            cursor: pointer;
            transition: transform 0.15s;
        }
        #likeBtn:hover {
            transform: scale(1.2);
        }
    </style>
</head>
<body>
<header class="navbar">
    <div class="navbar-top">

        <div class="navbar-left">
            <img src="../../other photo/WFL-logo.png" alt="WFL Logo" class="navbar-logo">
            <div class="school-name-block">
                <div class="school-cn">上 海 青 浦 区 世 外 高 级 中 学</div>
                <div class="school-en">SHANGHAI QINGPU WORLD FOREIGN LANGUAGE HIGH SCHOOL</div>
            </div>
        </div>
        <nav class="navbar-links">
            <a href="../../index.html">首页</a>
            <div class="dropdown">
                <a class="dropbtn">全部社团</a>
                <div class="dropdown-content">
                    <a href="../../creativity/creativity-type.html">创意艺术</a>
                    <a href="../../activity/activity-type.html">体育活动</a>
                    <a href="../../service/service-type.html">社会服务</a>
                    <a href="../../study/study-type.html">学术类</a>
                </div>
            </div>
            <a href="../../suggestion/suggestion.html">意见箱</a>
            <a onclick="window.location.href='Codecraft info_en.html'">EN/中文</a>
        </nav>

    </div>

</header>
<main class="container">
    <div class="top-info">
        <div class="leaders">
            <p><strong>社长：</strong><span id="president">加载中...</span></p>
            <p><strong>副社长：</strong><span id="vicePresident">加载中...</span></p>
            <p><strong>指导老师：</strong><span id="teacher">加载中...</span></p>
        </div>
        <img id="club-logo" src="" alt="社团Logo" style="width:120px;border-radius:8px;">
    </div>

    <section>
        <h2>社团简介</h2>
        <p id="club-intro">加载中...</p>
    </section>

    <section id="video-section" style="display:none;">
        <h2>社团视频展示</h2>
        <video id="club-video" width="480" controls>
            您的浏览器不支持 video 标签。
        </video>
    </section>
</main>

<footer style="text-align:center;margin-top:40px;color:#888;">
    <p>© 上海青浦世外高级中学 社团网站</p>
</footer>



<!-- ✅ JS 动态逻辑 -->
<script th:inline="javascript">
    // 从后端传入的 clubName（来自 PageController）
    const clubName = [[${clubName}]];
    console.log("当前社团名:", clubName);

    // 调用后端接口获取社团数据
    fetch(`/api/club/name-en/${clubName}`)
        .then(res => res.json())
        .then(result => {
            console.log("当前社团数据:", result);


            if (!result || !result.data) {
                document.getElementById("club-title").textContent = "未找到该社团信息";
                return;
            }

            // 动态渲染页面内容
            document.getElementById("club-title").textContent = result.data.clubName + "介绍";
            document.getElementById("president").textContent = result.data.president || "暂无";
            console.log("当前社长：" + result.data.president);
            document.getElementById("vicePresident").textContent = result.data.vicePresident || "暂无";
            console.log("当前副社长：" + result.data.vicePresident);
            document.getElementById("teacher").textContent = result.data.teacher || "暂无";
            console.log("当前指导老师：" + result.data.teacher);
            document.getElementById("club-intro").textContent = result.data.clubDescription || "暂无介绍";
            console.log("当前社团简介：" + result.data.clubDescription);

            if (r.logo) {
                document.getElementById("club-logo").src = result.data.logo;
            }

            if (club.video) {
                document.getElementById("video-section").style.display = "block";
                document.getElementById("club-video").src = result.data.video;
            }
        })
        .catch(err => {
            console.error("加载社团信息失败：", err);
            document.getElementById("club-title").textContent = "加载失败，请稍后再试";
        });
</script>
</body>
</html>

<a href="https://beian.miit.gov.cn" style="position: absolute; width: 100%; text-align: center; color: #888;">沪ICP备2025137067号</a>
</body>
</html>
