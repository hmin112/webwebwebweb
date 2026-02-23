import discord
from discord.ext import commands
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio

# --- [설정 부분] ---
# 실제 환경에 맞게 토큰과 ID를 확인해주세요.
TOKEN = ''
GUILD_ID =   
LOG_CHANNEL_ID =   
# ------------------

# 1. 디스코드 봇 설정
intents = discord.Intents.default()
intents.members = True 
bot = commands.Bot(command_prefix="!", intents=intents)

# 2. FastAPI 설정
app = FastAPI()

# CORS 설정 (리액트 및 스프링 부트 서버와의 통신 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# [공통 로직] 별명 파싱 및 멤버 상태/권한 정보 추출
def get_member_status_info(member):
    # 1. 별명(Nickname)에서 학번 식별자와 이름 추출
    # 형식 예시: "22 홍길동" -> studentId: "22", name: "홍길동"
    # 형식 예시: "LAB 김철수" -> studentId: "LAB", name: "김철수"
    nickname = member.display_name # 서버 내 별명을 가져옴
    name = nickname
    student_id = "Unknown"
    
    if " " in nickname:
        parts = nickname.split(" ", 1)
        student_id = parts[0] # "22" 또는 "LAB"
        name = parts[1]      # "홍길동"

    # 2. 역할(Role) 분석
    user_roles = [role.name for role in member.roles]
    
    # 권한(role) 판별: "관리자", "ADMIN", "간부진" 중 하나라도 있으면 ADMIN
    role_type = "USER"
    if any(r in user_roles for r in ["관리자", "ADMIN", "간부진"]):
        role_type = "ADMIN"

    # 학생 상태(userStatus) 판별: 역할을 기반으로 상태 배지 결정
    status = "일반"
    if "LAB" in user_roles:
        status = "LAB"
    elif "재학생" in user_roles:
        status = "재학생"
    elif "휴학생" in user_roles:
        status = "휴학생"
    elif "졸업생" in user_roles:
        status = "졸업생"
    elif "신입생" in user_roles:
        status = "신입생"

    # 프로필 이미지 URL 추출 (디스코드 CDN 링크)
    avatar_url = str(member.display_avatar.url)

    return {
        "discordTag": member.name,
        "name": name,           # 별명에서 추출한 이름
        "studentId": student_id, # 별명에서 추출한 학번 식별자 (22, LAB 등)
        "userStatus": status,    # 소속 상태
        "role": role_type,       # 서비스 권한 (ADMIN/USER)
        "avatarUrl": avatar_url  # 프로필 이미지 URL
    }

@bot.event
async def on_ready():
    print(f'✅ DEVSIGN 디스코드 봇 {bot.user}가 구동되었습니다!')

# [기능 1] 인증번호 발송 + 자동 추출된 부원 정보 응답
@app.post("/send-code")
async def receive_code(request: Request):
    data = await request.json()
    user_tag = data.get("discordTag")
    code = data.get("code")
    
    guild = bot.get_guild(GUILD_ID)
    if not guild:
        return {"status": "error", "message": "서버를 찾을 수 없습니다."}

    member = discord.utils.get(guild.members, name=user_tag)
    log_channel = bot.get_channel(LOG_CHANNEL_ID)

    if member:
        try:
            # 1:1 DM 발송
            await member.send(f"🔒 **DEVSIGN** 회원가입 인증번호는 **[{code}]** 입니다. 5분 내에 입력해주세요.")
            
            if log_channel:
                await log_channel.send(f"✅ 인증번호 발송 성공: {member.mention} (`{user_tag}`)")
            
            # 별명에서 추출한 정보와 역할 정보를 포함하여 반환
            user_info = get_member_status_info(member)
            return {"status": "success", **user_info}
            
        except Exception as e:
            return {"status": "error", "message": str(e)}
    else:
        if log_channel:
            await log_channel.send(f"⚠️ 발송 실패: `{user_tag}` 사용자를 서버에서 찾을 수 없습니다.")
        return {"status": "user_not_found"}

# [기능 2] 존재 여부 확인 및 정보 수신
@app.get("/check-member/{user_tag}")
async def check_member_exists(user_tag: str):
    guild = bot.get_guild(GUILD_ID)
    if not guild:
        return {"exists": False, "message": "서버 연결 오류"}
    
    member = discord.utils.get(guild.members, name=user_tag)
    if member:
        return {"exists": True, **get_member_status_info(member)}
    else:
        return {"exists": False, "message": "동아리 디스코드 서버에서 사용자를 찾을 수 없습니다."}

# [기능 3] 실시간 아바타 조회
@app.get("/get-avatar/{user_tag}")
async def get_user_avatar(user_tag: str):
    guild = bot.get_guild(GUILD_ID)
    if not guild:
        return {"status": "error", "avatarUrl": "https://cdn.discordapp.com/embed/avatars/0.png"}
    
    member = discord.utils.get(guild.members, name=user_tag)
    if member:
        return {"status": "success", "avatarUrl": str(member.display_avatar.url)}
    return {"status": "fail", "avatarUrl": "https://cdn.discordapp.com/embed/avatars/0.png"}

# [기능 4] 관리자용 전체 부원 정보 동기화
# 모든 부원의 별명, 역할, 아바타 정보를 일괄적으로 추출하여 스프링 부트로 전달합니다.
@app.get("/sync-all-members")
async def sync_all_members():
    guild = bot.get_guild(GUILD_ID)
    if not guild:
        return {"status": "error", "message": "서버를 찾을 수 없습니다."}

    all_members_info = []
    for m in guild.members:
        # 봇 계정은 명단에서 제외
        if not m.bot:
            all_members_info.append(get_member_status_info(m))
            
    return {
        "status": "success", 
        "count": len(all_members_info),
        "members": all_members_info
    }

# 메인 실행 루프
async def main():
    # FastAPI 서버와 디스코드 봇을 동시에 실행
    config = uvicorn.Config(app, host="127.0.0.1", port=8000, loop="asyncio")
    server = uvicorn.Server(config)
    
    await asyncio.gather(
        server.serve(),
        bot.start(TOKEN)
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass