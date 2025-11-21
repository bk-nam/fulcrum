# 📐 Fulcrum (펄크럼)
> **"Give me a place to stand, and a lever long enough, and I will move the world."** - Archimedes

**Fulcrum**은 매일 새로운 프로젝트를 시작하는 '메이커(Maker)'를 위한 **개인용 개발자 플랫폼 (Personal Developer Platform, PDP)**입니다.

단순한 프로젝트 런처가 아닙니다. Fulcrum은 수많은 사이드 프로젝트의 **생명주기(Lifecycle)를 관리**하고, **컨텍스트 스위칭 비용을 제로(0)**로 만들며, **AI 에이전트(Claude/Gemini)와의 협업을 주도하는 사령부(Command Center)** 역할을 수행합니다.

---

## 💡 Why Fulcrum?

다수의 프로젝트를 동시에 진행할 때 발생하는 문제들을 해결하기 위해 만들어졌습니다.

1.  **Context Switching Cost:** 프로젝트 A에서 B로 넘어갈 때, "마지막에 뭐 했더라?"를 떠올리는 시간을 없앱니다.
2.  **Zombie Projects:** 만들어두고 잊혀지는 프로젝트를 방지하고, 상태(Active/Archive)를 명확히 관리합니다.
3.  **AI Collaboration:** 각 프로젝트의 상황(Context)을 AI에게 매번 설명하는 번거로움을 없애고, 구조화된 데이터(`wbs.yaml`)를 통해 즉시 업무를 지시합니다.

---

## 🚀 Key Features

### ⚡️ Instant Context Launcher
- 클릭 한 번으로 프로젝트의 **IDE + 터미널** 동시 실행
- 프로젝트별 실행 경로와 환경 자동 인식

### 🧠 AI Command Center
- **구조화된 WBS (`wbs.yaml`)** 기반 프로젝트 관리
- **GUI 편집기**: 드래그 앤 드롭으로 Phase/Task 관리
- **"Copy Context for AI"**: 프로젝트 컨텍스트를 AI에게 즉시 전달

### 📊 Live Dashboard
- **Status Tagging**: Active/Maintenance/Archive/Idea 상태 관리
- **Freshness Indicator**: 마지막 수정 시간 기반 프로젝트 건강도 시각화
- **Tech Stack & Phase**: `wbs.yaml` 실시간 파싱 및 배지 표시

### 💡 Virtual Projects
- 아이디어 단계 프로젝트 저장 및 관리
- 실제 프로젝트로 변환 (자동 초기화)

### 🔧 Dev Tooling
- **Env Viewer**: `.env` 파일 읽기 (민감 정보 마스킹)
- **Quick Notes**: 프로젝트별 메모 작성

---

## 🛠️ Tech Stack

- **Electron + Vite** (Desktop App)
- **React + TypeScript** (Frontend)
- **Tailwind CSS + shadcn/ui** (Styling)
- **electron-store + js-yaml** (Data)

---

## 💿 Installation

이 프로젝트는 로컬 환경에서 실행되도록 설계되었습니다.

```bash
# 1. Clone repository
git clone [https://github.com/your-username/fulcrum.git](https://github.com/your-username/fulcrum.git)

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev

# 4. Build for production
npm run build