// ── Thread store ─────────────────────────────────
const NudgeContext = (function() {

  // A thread links emails, tasks, approvals, 
  // and schedule items by topic/person/keyword
  // State
  const threads = {};

  // Indexing items
  function buildThreads() {
    // Index all items (from global objects if populated)
    const allItems = [];
    // Initialize as empty; will be populated by active data modules.

    // Extract keywords from each item
    allItems.forEach(item => {
      const keywords = extractKeywords(item);
      keywords.forEach(kw => {
        if (!threads[kw]) threads[kw] = {
          id: kw,
          label: kw,
          items: [],
          urgency: 0
        };
        if (!threads[kw].items.find(x => x._id === item._id)) {
          threads[kw].items.push(item);
        }
        // Score urgency
        if (item.tags?.includes('Urgent') || 
            item.tags?.includes('high') ||
            item.priority === 'high') {
          threads[kw].urgency += 2;
        } else {
          threads[kw].urgency += 1;
        }
      });
    });

    // Remove threads with only 1 item — no connection
    Object.keys(threads).forEach(k => {
      if (threads[k].items.length < 2) delete threads[k];
    });
  }

  // ── Extract keywords ─────────────────────────
  function extractKeywords(item) {
    const text = [
      item.sender || '',
      item.subject || '',
      item.title || '',
      item.body || '',
      item.snippet || '',
      ...(item.tags || [])
    ].join(' ').toLowerCase();

    const stopwords = new Set([
      'the','a','an','and','or','but','in','on',
      'at','to','for','of','with','is','are','was',
      'be','have','has','had','will','would','could',
      'should','this','that','from','by','as','it',
      'its','not','no','so','if','do','did','my',
      'your','our','their','we','you','i','me','him',
      'her','they','re','ve','ll','d','s','t'
    ]);

    const words = text
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopwords.has(w));

    // Also extract names (capitalized words from 
    // original text)
    const names = [
      item.sender || '',
      item.subject || '',
      item.title || ''
    ].join(' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && /^[A-Z]/.test(w))
      .map(w => w.toLowerCase().replace(/[^a-z]/g,''));

    return [...new Set([...words, ...names])];
  }

  // ── Get threads for a specific item ──────────
  function getThreadsForItem(itemId) {
    return Object.values(threads).filter(thread =>
      thread.items.some(i => i._id === itemId)
    ).sort((a, b) => b.urgency - a.urgency);
  }

  // ── Get all threads sorted by urgency ────────
  function getAllThreads() {
    return Object.values(threads)
      .sort((a, b) => b.urgency - a.urgency);
  }

  // ── Get related items for an item ────────────
  function getRelated(itemId) {
    const related = new Map();
    getThreadsForItem(itemId).forEach(thread => {
      thread.items.forEach(item => {
        if (item._id !== itemId) {
          related.set(item._id, item);
        }
      });
    });
    return Array.from(related.values());
  }

  buildThreads();

  return { 
    getThreadsForItem,
    getAllThreads,
    getRelated,
    threads
  };
})();
