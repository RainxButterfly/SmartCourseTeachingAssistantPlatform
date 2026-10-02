import type { QuizCitation, QuizDifficulty, QuizType } from '@/schemas/quiz'

/**
 * mock 题库（服务端侧形态：**含答案与解析**）。
 * 真实实现由 Python AI 服务按薄弱点构造 Prompt 并结构化输出，这里用固定题库保证可断言。
 */
export interface QuizBankItem {
  course_id: number
  type: QuizType
  difficulty: QuizDifficulty
  stem: string
  /** 单选/多选为正解（选项文本，多选无序）；填空为正解；简答为参考答案 */
  answer: string | string[]
  /** 选择题选项；非选择题可省略 */
  options?: string[]
  explanation: string
  /** 知识点，用于生成 weak_points_generated */
  point: string
  citation: QuizCitation
}

const OS_CITATION: QuizCitation = {
  material_id: 101,
  title: '第3章 内存管理.pdf',
  page: 12,
  snippet: '分页机制将进程的逻辑地址空间切分成若干固定大小的页，通过页表建立页到物理帧的映射。',
}

const SCHED_CITATION: QuizCitation = {
  material_id: 103,
  title: '进程调度讲义.pptx',
  page: 21,
  snippet: '时间片轮转按固定时间片轮流调度就绪队列中的进程，保证公平性但上下文切换开销较大。',
}

const TREE_CITATION: QuizCitation = {
  material_id: 201,
  title: '红黑树与平衡树.pdf',
  page: 8,
  snippet:
    '红黑树通过五条性质把树高约束在 O(log n)，插入后若出现连续红节点需按叔叔节点颜色决定变色或旋转。',
}

const GRAPH_CITATION: QuizCitation = {
  material_id: 202,
  title: '图论算法笔记.md',
  page: 0,
  snippet: 'Dijkstra 要求边权非负，每轮从未确定集合中取出距离最小的顶点并松弛其出边。',
}

const TCP_CITATION: QuizCitation = {
  material_id: 301,
  title: 'TCP 可靠传输.pdf',
  page: 33,
  snippet: '慢启动阶段拥塞窗口按指数增长，达到阈值后转为拥塞避免的线性增长。',
}

export const quizBankFixtures: QuizBankItem[] = [
  {
    course_id: 1,
    type: 'SINGLE',
    difficulty: 'EASY',
    stem: '分页机制最主要解决了什么问题？',
    options: ['消除外部碎片', '减少页表项数量', '提高磁盘 IO 速度', '降低缺页率'],
    answer: '消除外部碎片',
    explanation: '分页把逻辑地址空间切成固定大小的页，按页分配物理帧，因此不会产生外部碎片。',
    point: '页表与地址翻译',
    citation: OS_CITATION,
  },
  {
    course_id: 1,
    type: 'SINGLE',
    difficulty: 'MEDIUM',
    stem: 'TLB 命中时，地址翻译还需要访问几次内存？',
    options: ['0 次', '1 次', '2 次', '3 次'],
    answer: '1 次',
    explanation: 'TLB 缓存了页表项，命中后无需再查内存中的页表，只需按物理地址访问一次目标数据。',
    point: '页表与地址翻译',
    citation: OS_CITATION,
  },
  {
    course_id: 1,
    type: 'MULTIPLE',
    difficulty: 'MEDIUM',
    stem: '下列哪些措施可以减少缺页中断的发生？（多选）',
    options: ['增大物理内存', '提高置换算法的命中率', '增大时间片', '利用局部性原理预取'],
    answer: ['增大物理内存', '提高置换算法的命中率', '利用局部性原理预取'],
    explanation: '时间片长度影响的是进程调度公平性，与缺页频率无直接关系。',
    point: '虚拟内存与置换',
    citation: OS_CITATION,
  },
  {
    course_id: 1,
    type: 'FILL',
    difficulty: 'MEDIUM',
    stem: '进程调度中，按固定时间片轮流运行就绪进程的算法称为______调度。',
    answer: '时间片轮转',
    explanation: '时间片轮转（Round Robin）按固定时间片轮流调度，保证公平性但切换开销较大。',
    point: '进程调度算法',
    citation: SCHED_CITATION,
  },
  {
    course_id: 1,
    type: 'ESSAY',
    difficulty: 'HARD',
    stem: '简述多级页表相比单级页表的两点优势。',
    answer: '按需分配页表、节省连续内存；减少页表占用空间',
    explanation: '多级页表允许页表本身离散存放并按需创建，避免为整个地址空间预留连续的大块页表。',
    point: '页表与地址翻译',
    citation: OS_CITATION,
  },
  {
    course_id: 1,
    type: 'SINGLE',
    difficulty: 'HARD',
    stem: '在按需调页系统中，「抖动」指的是什么？',
    options: [
      '进程频繁换页导致 CPU 利用率骤降',
      '内存碎片过多导致分配失败',
      '页表项命中率过高',
      '磁盘 IO 顺序化',
    ],
    answer: '进程频繁换页导致 CPU 利用率骤降',
    explanation: '抖动（thrashing）指进程的工作集超出可用物理内存，导致大部分时间耗在换页上。',
    point: '虚拟内存与置换',
    citation: OS_CITATION,
  },
  {
    course_id: 2,
    type: 'SINGLE',
    difficulty: 'MEDIUM',
    stem: '红黑树插入后出现连续的红色节点时，首先依据什么决定处理方式？',
    options: ['叔叔节点的颜色', '兄弟节点的颜色', '根节点的高度', '叶节点的深度'],
    answer: '叔叔节点的颜色',
    explanation: '叔叔为红则变色上推；叔叔为黑或不存在则旋转后重新着色。',
    point: '红黑树旋转',
    citation: TREE_CITATION,
  },
  {
    course_id: 2,
    type: 'MULTIPLE',
    difficulty: 'MEDIUM',
    stem: 'Dijkstra 算法成立的前提有哪些？（多选）',
    options: ['所有边权非负', '图可为有向图', '图必须连通', '不能含环'],
    answer: ['所有边权非负', '图可为有向图'],
    explanation:
      'Dijkstra 要求边权非负；有向图同样适用。图不连通时只是部分顶点不可达，含环也不影响。',
    point: '最短路径',
    citation: GRAPH_CITATION,
  },
  {
    course_id: 2,
    type: 'FILL',
    difficulty: 'EASY',
    stem: '红黑树中，任一节点到其所有叶节点的______数量相同。',
    answer: '黑色节点',
    explanation: '这条性质（黑高一致）是红黑树把树高约束在 O(log n) 的关键。',
    point: '红黑树旋转',
    citation: TREE_CITATION,
  },
  {
    course_id: 2,
    type: 'ESSAY',
    difficulty: 'HARD',
    stem: '说明动态规划与贪心算法在适用条件上的核心差异。',
    answer: '贪心要求局部最优可推出全局最优；动态规划通过子问题重叠与最优子结构求解',
    explanation: '贪心不做回退、依赖贪心选择性质；动态规划需要最优子结构并对重叠子问题记忆化。',
    point: '算法设计范式',
    citation: GRAPH_CITATION,
  },
  {
    course_id: 3,
    type: 'SINGLE',
    difficulty: 'MEDIUM',
    stem: 'TCP 慢启动阶段，拥塞窗口如何增长？',
    options: ['按指数增长', '按线性增长', '保持不变', '随机波动'],
    answer: '按指数增长',
    explanation: '慢启动每收到一个 ACK 就增加一个 MSS，表现为指数增长；达到阈值后转为拥塞避免。',
    point: 'TCP 拥塞控制',
    citation: TCP_CITATION,
  },
  {
    course_id: 3,
    type: 'MULTIPLE',
    difficulty: 'HARD',
    stem: '下列哪些机制用于 TCP 的可靠传输？（多选）',
    options: ['超时重传', '快速重传', '滑动窗口', 'ARP 缓存'],
    answer: ['超时重传', '快速重传', '滑动窗口'],
    explanation: 'ARP 负责 IP 到 MAC 的解析，与传输层可靠性无关。',
    point: 'TCP 可靠传输',
    citation: TCP_CITATION,
  },
  {
    course_id: 3,
    type: 'FILL',
    difficulty: 'MEDIUM',
    stem: 'TCP 通过______机制实现流量控制，避免接收方缓冲区溢出。',
    answer: '滑动窗口',
    explanation: '接收方通过窗口字段告知可用缓冲区大小，发送方据此调整在途数据量。',
    point: 'TCP 可靠传输',
    citation: TCP_CITATION,
  },
  {
    course_id: 3,
    type: 'ESSAY',
    difficulty: 'HARD',
    stem: '简述快速重传与超时重传的触发条件差异。',
    answer: '快速重传由重复 ACK 触发；超时重传由计时器超时触发',
    explanation: '收到三个重复 ACK 即认为丢包并立即重传，无需等待计时器超时，从而更快恢复。',
    point: 'TCP 可靠传输',
    citation: TCP_CITATION,
  },
]

/** 薄弱知识点（score 为掌握度 0~1，越低越薄弱；course_id 为 mock 内部字段） */
export interface WeakPointFixture {
  course_id: number
  point_name: string
  score: number
  weight: number
}

export const weakPointFixtures: WeakPointFixture[] = [
  { course_id: 1, point_name: '虚拟内存与置换', score: 0.28, weight: 0.9 },
  { course_id: 1, point_name: '进程调度算法', score: 0.42, weight: 0.7 },
  { course_id: 1, point_name: '页表与地址翻译', score: 0.51, weight: 0.85 },
  { course_id: 2, point_name: '红黑树旋转', score: 0.35, weight: 0.8 },
  { course_id: 2, point_name: '算法设计范式', score: 0.58, weight: 0.6 },
  { course_id: 3, point_name: 'TCP 拥塞控制', score: 0.33, weight: 0.75 },
  { course_id: 3, point_name: 'TCP 可靠传输', score: 0.47, weight: 0.65 },
]
