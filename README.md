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

### 1. ⚡️ Instant Context Launcher (유니버설 런처)
- 클릭 한 번으로 해당 프로젝트의 **IDE(Antigravity/VS Code)**와 **터미널**을 동시에 실행합니다.
- 프로젝트별 실행 경로와 환경을 자동으로 인식합니다.

### 2. 🧠 AI Command Center (지능형 WBS)
- 단순한 `TODO.md`가 아닌, **SI급 구조화된 WBS (`wbs.yaml`)**를 제공합니다.
- **"Copy Context for AI"**: 버튼 하나로 프로젝트의 목표, 기술 스택, 현재 진행 단계(Phase), 남은 할 일 목록을 프롬프트 형태로 클립보드에 복사합니다.
- AI(Claude Code 등)는 이 맥락을 완벽히 이해하고 코드를 작성합니다.

### 3. 📊 Live Dashboard (상태 시각화)
- 단순한 폴더 목록이 아닌, 살아있는 현황판을 제공합니다.
- `wbs.yaml`을 실시간으로 파싱하여 **기술 스택(Tech Stack)**, **현재 단계(Phase)**, **우선순위(Priority)**를 배지 형태로 보여줍니다.

### 4. 🏗️ Scaffolding & Lifecycle (Planned)
- **One-Click Start:** 자주 쓰는 스택(Next.js, Python 등)으로 프로젝트를 1초 만에 생성합니다.
- **Zombie Killer:** 오랫동안 손대지 않은 프로젝트를 시각화하여 정리하거나 되살립니다.

---

## 🛠️ Tech Stack

Fulcrum은 빠르고 강력한 로컬 제어를 위해 다음 기술들로 제작되었습니다.

- **Core:** Electron (v33+)
- **Builder:** Vite
- **Frontend:** React 18, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **State/Data:** electron-store (Persistence), js-yaml (Parser)

---

## 📖 How to Use (The AI Workflow)

Fulcrum을 사용하여 AI와 협업하는 표준 워크플로우입니다.

1.  **Scan:** Fulcrum을 실행하여 로컬 프로젝트들을 스캔합니다.
2.  **Initialize:** 관리하고 싶은 프로젝트를 클릭하고 **"Initialize Structured WBS"** 버튼을 누릅니다.
3.  **Plan:** 생성된 `wbs.yaml`에 프로젝트의 목표와 대략적인 계획을 적습니다.
4.  **Copy:** **"Copy Context for AI"** 버튼을 클릭합니다.
5.  **Generate:** Claude Code나 ChatGPT에게 붙여넣고 명령합니다.
    > *"복사한 맥락을 바탕으로 Phase 1의 상세 구현 계획을 짜줘."*
6.  **Apply:** AI가 짜준 YAML을 다시 Fulcrum 에디터에 붙여넣고 저장합니다.

---

## 🗺️ Roadmap

현재 **v0.2 (Command Center)** 단계이며, 지속적으로 진화 중입니다.

- [x] **Phase 1:** Core Engine & Scanner (완료)
- [x] **Phase 2:** Instant Launcher & Settings (완료)
- [x] **Phase 3:** Structured WBS Editor & AI Bridge (완료)
- [ ] **Phase 4:** Dashboard Intelligence (진행 중)
- [ ] **Phase 5:** Lifecycle Management (Zombie Project Filter)
- [ ] **Phase 6:** Scaffolding Factory

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