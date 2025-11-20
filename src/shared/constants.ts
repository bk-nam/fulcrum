/**
 * Shared constants for Fulcrum
 */

import type { VirtualProject } from './types.js';

export const WBS_TEMPLATE = `project_info:
  name: "Project Name"
  period: "2025-11-20 ~ 2025-12-31"
  owner: "User"
  tech_stack: ["Electron", "React", "TypeScript"]

milestones:
  - title: "Analysis & Design"
    due_date: "2025-11-25"
    status: "Pending" # Pending, Done, Delayed
  - title: "MVP Release"
    due_date: "2025-12-10"
    status: "Pending"

phases:
  - name: "Phase 1: Foundation"
    tasks:
      - id: "INIT-001"
        title: "Environment Setup"
        priority: "P0" # P0, P1, P2, P3
        status: "Ready" # Ready, In Progress, Review, Done
        period: "2025-11-20 ~ 2025-11-21"
        spec: |
          Detailed implementation plan goes here.
          Multi-line text is supported in YAML.
          1. Install dependencies
          2. Configure CI/CD
      - id: "INIT-002"
        title: "Database Schema"
        priority: "P0"
        status: "Ready"
        period: "TBD"
        spec: |
          Define User and Project tables.

risks:
  - severity: "High"
    description: "Potential API rate limits"
    mitigation: "Implement caching strategy"
`;

export const AI_CONTEXT_PROMPT_TEMPLATE = (wbsContent: string) => `Current Project Context (YAML format):

${wbsContent}

Instruction:
Please review the 'project_info', 'milestones', and 'phases' above.
Based on this structured data, please [INSERT REQUEST].

Maintain the YAML structure strictly when replying with updates.`;

export const VIRTUAL_PROJECT_CONTEXT_TEMPLATE = (vp: VirtualProject) => `# Project Idea: ${vp.name}

${vp.description}

## Problem
${vp.problem}

## Proposed Solution
${vp.solution}

## Target Users
${vp.targetUsers}

## Planned Tech Stack
${vp.targetTechStack.length > 0 ? vp.targetTechStack.join(', ') : 'Not specified yet'}

## Estimated Size
${vp.estimatedSize === 'unknown' ? 'To be determined' :
  vp.estimatedSize === 'weekend' ? 'Weekend project (~2 days)' :
  vp.estimatedSize === 'week' ? 'One week project (~5 days)' :
  vp.estimatedSize === 'month' ? 'Month-long project' :
  'Epic project (multi-month)'}

${vp.inspiration ? `## Inspiration\n${vp.inspiration}\n` : ''}
${vp.tags.length > 0 ? `## Tags\n${vp.tags.join(', ')}\n` : ''}
${vp.links.length > 0 ? `## References\n${vp.links.map(l => `- ${l}`).join('\n')}\n` : ''}

---

Based on this idea, please help me:
1. Refine the concept and identify potential challenges
2. Suggest alternative approaches or technologies
3. Create a draft Work Breakdown Structure (WBS)
4. Recommend MVP features to prioritize
`;
