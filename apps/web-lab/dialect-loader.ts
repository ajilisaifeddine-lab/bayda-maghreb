import { z } from 'zod';

// 1. تحديد المخطط الأمني الصارم لبيانات اللهجة (منع Prototype Pollution)
const KeywordSchema = z.record(z.string(), z.string());
const VocabularySchema = z.record(z.string(), z.string());

const DialectDataSchema = z.object({
    manifest: z.object({
        id: z.string(),
        version: z.string(),
        name: z.string(),
    }).passthrough(),
    keywords: KeywordSchema,
    vocabulary: VocabularySchema,
});

export type DialectData = z.infer<typeof DialectDataSchema>;

// 2. إعدادات قاعدة البيانات المحلية (IndexedDB)
const DB_NAME = 'bayda_dialects_db';
const DB_VERSION = 1;
const STORE_NAME = 'dialects';

function initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 3. دالة الحفظ الآمن (تفحص البيانات بـ Zod أولاً)
export async function saveDialectToDevice(dialectId: string, rawData: unknown): Promise<void> {
    const parseResult = DialectDataSchema.safeParse(rawData);
    
    if (!parseResult.success) {
        console.error('❌ رُفضت البيانات: تحتوي على هيكل غير صالح أو محاولة حقن.', parseResult.error);
        throw new Error('بيانات اللهجة غير صالحة أو غير آمنة.');
    }

    const safeData = parseResult.data;
    const db = await initDB();
    
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const record = { id: dialectId, data: safeData, timestamp: Date.now() };
        
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// 4. دالة الاسترجاع (للاستخدام بدون إنترنت)
export async function getDialectFromDevice(dialectId: string): Promise<DialectData | null> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(dialectId);
        req.onsuccess = () => {
            if (req.result) {
                // إعادة التحقق من البيانات المخزنة لضمان عدم التلاعب بها من أدوات المطور
                const reparse = DialectDataSchema.safeParse(req.result.data);
                resolve(reparse.success ? reparse.data : null);
            } else {
                resolve(null);
            }
        };
        req.onerror = () => reject(req.error);
    });
}

// 5. دالة الجلب من الشبكة (أو النواة) والحفظ الآمن
export async function fetchAndSaveDialect(dialectId: string, baseUrl: string): Promise<void> {
    try {
        // جلب الملفات الثلاثة بشكل متوازي لتسريع العملية
        const [manifestRes, keywordsRes, vocabRes] = await Promise.all([
            fetch(`${baseUrl}/manifest.json`),
            fetch(`${baseUrl}/keywords.json`),
            fetch(`${baseUrl}/vocabulary.json`)
        ]);

        if (!manifestRes.ok || !keywordsRes.ok || !vocabRes.ok) {
            throw new Error('فشل الاتصال بالنواة أو الملفات غير موجودة.');
        }

        const manifest = await manifestRes.json();
        const keywords = await keywordsRes.json();
        const vocabulary = await vocabRes.json();

        // تجميع البيانات في كائن واحد
        const fullData = { manifest, keywords, vocabulary };

        // تمرير البيانات لدرع الحماية (Zod) للحفظ
        await saveDialectToDevice(dialectId, fullData);
        
        console.log(`✅ تم جلب وحفظ اللهجة [${dialectId}] بنجاح.`);
    } catch (error) {
        console.error(`❌ فشل تحميل اللهجة [${dialectId}]:`, error);
        throw error; 
    }
}
