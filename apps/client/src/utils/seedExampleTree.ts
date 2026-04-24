import type { ChatMessage, Tree, TreeNode } from '@repo/types'
import { db } from '../db'
import { useTreeStore } from '../store/treeStore'

/**
 * Example "Transformer · attention" tree — seeded for new users who haven't
 * had any conversation yet. Mirrors the V4 editorial FIG. I diagram:
 *
 *   Transformer · attention
 *   ├─ Q/K/V
 *   │  ├─ 点积
 *   │  └─ softmax
 *   ├─ 位置编码
 *   │  ├─ 绝对
 *   │  ├─ 相对
 *   │  └─ RoPE
 *   └─ 多头
 *      ├─ 并行
 *      └─ 融合
 */

interface ExampleNode {
  title: string
  /** The phrase from the parent's answer that "spawned" this branch. Empty for root. */
  selectedText: string | null
  question: string
  answer: string
  children?: ExampleNode[]
}

const EXAMPLE_TREE: ExampleNode = {
  title: 'Transformer · attention',
  selectedText: null,
  question: '一句话告诉我，Transformer 里的 attention 到底在做什么？',
  answer: `Attention 是 Transformer 的心脏，它让每个 token 在处理自己时「看一眼」序列里的其他 token，按相关性加权地把信息聚合过来。

具体只有三件事：

1. 每个 token 被拆成三份角色 —— **Q/K/V**（查询 / 键 / 值）。Q 是"我想找什么"，K 是"我是谁"，V 是"我想传给你什么"。
2. 每一对 token 之间算一个分数（当前用的是**点积**），过一次 softmax 变成概率分布，这就是"注意力权重"。
3. 把权重乘到每个位置的 V 上相加，就得到了这个 token"看完全局之后"的新表示。

在这之上还要解决两个事：Transformer 本身不感知顺序，需要**位置编码**把前后关系注入；一层只有一个头表达能力不够，所以要**多头**并行看不同模式。这棵树就围绕这三条主干展开。`,
  children: [
    {
      title: 'Q/K/V',
      selectedText: 'Q/K/V',
      question: '为什么非要拆成 Q/K/V 三个矩阵？一个矩阵不行吗？',
      answer: `关键是要把**"我想找什么"**、**"我是谁"**和**"我真正要传的内容"**三件事解耦。

- **Q（Query）**：当前 token 的"提问"。例如处理动词"吃"时，它想找的是"谁吃 / 吃什么"。
- **K（Key）**：每个 token 对外的"标签"。名词"苹果"的 K 会写成"我是可食用物体"。
- **V（Value）**：真正被加权抽取的内容。权重由 Q·K 决定，但聚合的是 V。

如果只用一个矩阵同时承担"提问"和"回答"，网络就没法灵活地让"动词问"和"名词答"走不同的表达空间——Q 和 K 解耦等于在低维空间里专门学一张"匹配表"，而 V 可以独立学"要传什么"。

这个拆分还带来一个工程好处：K 和 V 可以提前缓存（KV cache），推理时 Q 可以只算新 token 的那一份，复杂度从 O(n²) 降到 O(n)。`,
      children: [
        {
          title: '点积',
          selectedText: '点积',
          question: '为什么用点积做打分函数，加法或者神经网络不行吗？',
          answer: `点积的选择不是拍脑袋，是三件事共同推出来的：

1. **几何意义直接**：Q·K 等价于两个向量的余弦相似度乘以模长，本质上就是"方向有多对齐"。这恰好就是 attention 要问的问题。
2. **矩阵乘法 GPU 友好**：n 个 Q 和 n 个 K 的全部打分就是一次 n×d × d×n 的 GEMM，可以压到一条 CUDA kernel，比逐对算加法或过 MLP 快几个数量级。
3. **可微且数值稳定**：点积再除以 √d 就是 scaled dot-product attention —— 除以 √d 是为了不让维度越大、点积方差越大，导致 softmax 饱和梯度消失。

加法注意力（Bahdanau 那种 tanh(Wq + Wk)）效果差不多，但多了一层 MLP，在长序列上开销明显更高。`,
        },
        {
          title: 'softmax',
          selectedText: 'softmax',
          question: 'softmax 在 attention 里到底起什么作用？不能直接用点积吗？',
          answer: `Softmax 做了两件无可替代的事：

- **归一化成概率**：点积的原始分数量级不受控（可能几十、也可能几百），softmax 把它压到 [0, 1] 且和为 1，后面加权求和时总能量守恒。
- **放大差异**：softmax 是指数的，分数稍微高一点权重就高很多。这让模型能"挑出"真正相关的 token，而不是均匀关注所有位置。

如果直接用原始点积加权：
- 大分数会让 V 爆炸，小分数几乎不起作用；
- 训练时梯度流非常不稳定；
- 得到的不再是"注意力分布"而是一堆未归一化的线性组合，丢失了概率解释。

近年也有变种，比如用 ReLU 或 Sparsemax 代替 softmax 来稀疏化注意力，但主流仍然是 softmax。`,
        },
      ],
    },
    {
      title: '位置编码',
      selectedText: '位置编码',
      question: 'attention 为什么不感知顺序？位置信息是怎么注入进去的？',
      answer: `Attention 天生是 **permutation-equivariant** 的——把输入序列打乱顺序，输出也只是相应打乱，注意力本身不知道"谁在前谁在后"。而语言、代码、音频这些序列的顺序是核心信息，所以必须显式注入位置。

三种主流做法：

- **绝对位置编码（Sinusoidal）**：原版 Transformer 用正弦余弦不同频率给每个位置生成一个固定向量，加到 token embedding 上。优点：不需要训练参数；缺点：外推到更长序列不稳。
- **相对位置编码**：不编码"在第几位"，而是编码"两个 token 的距离"。T5、DeBERTa 用的就是这一套。对长距离泛化更稳。
- **RoPE（Rotary Position Embedding）**：通过把 Q 和 K 在二维子空间里按位置做旋转，等价地把相对位置信息乘进了点积里。LLaMA、通义千问、Kimi 都在用，因为它同时具备"绝对+相对"两套的优点。

再往上还有 ALiBi 这种用 bias 直接加到 attention score 上的做法，工程简单，外推能力最强。`,
      children: [
        {
          title: '绝对',
          selectedText: '绝对位置编码',
          question: '绝对位置编码（正弦余弦）具体是怎么算的？',
          answer: `给序列里第 \`pos\` 个位置生成一个 d 维向量，其中第 \`2i\` 维和第 \`2i+1\` 维是：

$$
PE_{pos, 2i} = \\sin\\left(\\frac{pos}{10000^{2i/d}}\\right), \\quad PE_{pos, 2i+1} = \\cos\\left(\\frac{pos}{10000^{2i/d}}\\right)
$$

直觉：不同维度用不同频率的正弦波，低维是"长波"（区分大范围位置），高维是"短波"（区分相邻位置）。多维组合起来就是位置的"指纹"。

把这个 PE 直接**加到** token embedding 上，模型在 self-attention 里自然能读出顺序。

优点是**无参数 + 周期性**，理论上可以外推到训练时没见过的更长序列；缺点是实证效果有限，当序列变得很长时注意力分布会飘。`,
        },
        {
          title: '相对',
          selectedText: '相对位置',
          question: '相对位置编码到底在编什么？',
          answer: `不编"是第几位"，而编"你距离我多远"。

典型做法（T5 里的）：在计算 attention score 时，不只用 Q·K，还加一个仅依赖 **i - j**（token i 到 token j 的距离）的偏置项 \`b(i - j)\`：

$$
\\text{score}(i, j) = \\frac{Q_i \\cdot K_j}{\\sqrt{d}} + b(i - j)
$$

这个偏置通常用分桶（bucket）的方式：距离 0/1/2 各一个值，距离 3–7 共用一个值，距离 8–15 共用一个值……这样既稀疏又能覆盖长距离。

相对位置编码的核心好处是**平移不变**——同一段话放在句首还是句末，内部 token 之间的相对关系不变，模型在长序列上泛化更自然。`,
        },
        {
          title: 'RoPE',
          selectedText: 'RoPE',
          question: 'RoPE 旋转位置编码为什么能同时拿到绝对 + 相对的好处？',
          answer: `RoPE 的核心操作是**把 Q 和 K 在二维子空间里按位置做旋转**。

把 d 维向量两两分组成 d/2 个二维向量，每一组乘上一个旋转矩阵：

$$
R_m = \\begin{pmatrix} \\cos m\\theta & -\\sin m\\theta \\\\ \\sin m\\theta & \\cos m\\theta \\end{pmatrix}
$$

其中 m 是位置索引，θ 是这一组的频率（和 sinusoidal 一样按维度递减）。

数学上的漂亮之处：
\`\`\`
(R_m · Q) · (R_n · K) = Q · R_{n-m} · K
\`\`\`
也就是说，经过 RoPE 旋转之后，Q·K 的结果**只依赖于 n - m 这个相对位置**——它天然带相对位置信息，同时 Q、K 本身又保留了绝对位置（因为它们是被旋转过的）。

工程上的好处：
- 完全无参数；
- 可以长度外推（当推理序列比训练长时，NTK-aware 缩放或 YaRN 调参就能稳住）；
- 和 Flash Attention 完美兼容。

这也是为什么 LLaMA 系、Qwen 系、Mistral 系、DeepSeek 都默认用 RoPE。`,
        },
      ],
    },
    {
      title: '多头',
      selectedText: '多头',
      question: '为什么要拆成多头，而不是一个更大的头？',
      answer: `单头注意力有一个**表达瓶颈**：所有 token 关系都被压在同一个 d 维空间里，注意力分布也只能是一种模式。但语言里的关系是多样的——句法依赖、指代消解、共指关系、局部 vs 全局……它们需要不同的"关注方式"。

多头做的事是：把 d 维切成 h 份（比如 d=512, h=8，每头 64 维），每一头在自己那 64 维的**子空间**里独立算一套 Q/K/V 和注意力。这样：

- 头 1 可能学到"主语-谓语"的结构依赖；
- 头 2 可能学到"名词-定语"的修饰关系；
- 头 3 可能关注局部窗口；
- 头 4 关注远距离引用。

最后把 h 个头的输出**拼接**再过一层线性（W_O）融合回 d 维。

关键：
1. 总参数量和单头相当（d×d 的矩阵被切成 h 个 d×(d/h)）；
2. 不同头学到的是**不同子空间里的不同关系**，不是简单的冗余；
3. **并行**——h 个头之间没有依赖，可以完全并行算，GPU 利用率高。`,
      children: [
        {
          title: '并行',
          selectedText: '并行',
          question: '多头之间怎么做到并行？是真的在硬件层面并行吗？',
          answer: `是的，是真并行——并且是在 **GPU tensor core** 层面并行。

实现上有一个小技巧：不是开 h 个独立的矩阵乘法 kernel，而是**把所有头的 Q/K/V 拼成一个大张量**一次算完。

具体地，输入 X 是 [batch, seq, d]，过一个大 W_Q（d × d）得到 Q = [batch, seq, d]，然后 reshape 成 [batch, seq, h, d/h]，再转置成 [batch, h, seq, d/h]。K、V 同理。

这样：
- Q @ K^T 直接算成 [batch, h, seq, seq]，**一次矩阵乘法包含了所有头**；
- softmax 也是一次做完；
- 乘 V 还是一次矩阵乘法。

整个 multi-head attention 只有 4 个大矩阵乘法（3 个产出 Q/K/V + 1 个输出投影），GPU 吃得很饱。这也是为什么 Flash Attention 这种 kernel fusion 优化能带来数倍的加速。`,
        },
        {
          title: '融合',
          selectedText: '融合',
          question: '多头的输出最后怎么融合？',
          answer: `融合分两步：

1. **拼接（Concat）**：把 h 个头的输出 [batch, seq, d/h] 沿最后一维拼回 [batch, seq, d]。这一步没有任何参数，只是 reshape。
2. **输出投影（W_O）**：过一个 d × d 的线性层。

$$
\\text{MultiHead}(Q, K, V) = \\text{Concat}(\\text{head}_1, \\ldots, \\text{head}_h) W_O
$$

W_O 的作用是让"各头学到的不同信息"在同一个空间里**重新混合**——拼接后的向量里，第 1-64 维是头 1 的输出，第 65-128 维是头 2 的输出……它们原本在各自的子空间里，W_O 把它们跨子空间地加权组合，得到最终的 d 维表示。

没有 W_O 的话，多头退化成"d/h 维子空间上各自为战"，信息就无法跨头交互。这一层虽然简单，但对效果至关重要。`,
        },
      ],
    },
  ],
}

/** Convert a full tree description into Dexie rows + in-memory state. */
export async function seedExampleTree(): Promise<{ treeId: string; rootNodeId: string }> {
  const now = Date.now()
  const tree: Tree = {
    id: crypto.randomUUID(),
    title: EXAMPLE_TREE.title,
    createdAt: now,
    updatedAt: now,
  }

  const nodes: TreeNode[] = []
  let rootNodeId = ''

  // Walk the tree and synthesize TreeNode rows top-down.
  const walk = (ex: ExampleNode, parentId: string | null, ts: number) => {
    const nodeId = crypto.randomUUID()
    if (parentId === null) rootNodeId = nodeId

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: ex.question,
      createdAt: ts,
    }
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: ex.answer,
      createdAt: ts + 1,
    }

    nodes.push({
      id: nodeId,
      treeId: tree.id,
      parentId,
      selectedText: ex.selectedText,
      title: ex.title,
      messages: [userMsg, assistantMsg],
      createdAt: ts,
    })

    // Give each child a monotonically increasing timestamp so ordering is stable.
    ex.children?.forEach((child, i) => walk(child, nodeId, ts + 10 + i))
  }
  walk(EXAMPLE_TREE, null, now)

  await db.trees.add(tree)
  await db.nodes.bulkAdd(nodes)

  useTreeStore.setState(state => ({
    trees: [tree, ...state.trees],
    nodes,
    currentTreeId: tree.id,
    currentNodeId: rootNodeId,
  }))

  return { treeId: tree.id, rootNodeId }
}

/** Lightweight metadata (no conversation content) for previewing the example in SideRail/Homepage. */
export const EXAMPLE_TREE_TITLE = EXAMPLE_TREE.title
