import { useActions, useSettings } from '../../state/AppState';
import React, { useState, useEffect } from 'react';
import ImageLoader from '../../components/ImageLoader';

import { SiteSettings } from '../../types';
import { errorMessage } from '../../services/api';
import { Package, Trash2, Save, Settings as SettingsIcon, Upload } from 'lucide-react';

export default function SiteSettingsFeature() {
const { siteSettings } = useSettings();
const { showToast, updateSiteSettings } = useActions();
const [saving, setSaving] = useState(false);
const [saveError, setSaveError] = useState('');
const [previews, setPreviews] = useState<Partial<Record<keyof SiteSettings, string>>>({});
    const [settingsForm, setSettingsForm] = useState<SiteSettings>({
        aboutTitle: '',
        aboutDescription: '',
        aboutImage: '',
        heroImage: '',
        suitsSectionImage: '',
        shirtsSectionImage: '',
        blazersSectionImage: '',
        accessoriesSectionImage: '',
        bespokeSectionImage: ''
    });
    // Hold raw File objects for settings uploads so we can send FormData
    const [settingsFiles, setSettingsFiles] = useState<Partial<Record<keyof SiteSettings, File>>>({});
    const [clearedSettingsImages, setClearedSettingsImages] = useState<Set<keyof SiteSettings>>(new Set());
    useEffect(() => {
        const urls = Object.fromEntries(Object.entries(settingsFiles).flatMap(([key, file]) => file instanceof File ? [[key, URL.createObjectURL(file)]] : []));
        setPreviews(urls);
        return () => Object.values(urls).forEach(url => URL.revokeObjectURL(url));
    }, [settingsFiles]);

    useEffect(() => {
        if (siteSettings) {
            setSettingsForm(siteSettings);
        }
    }, [siteSettings]);
    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        setSaveError('');
        try {
            const fieldMap: Record<string, string> = {
                aboutTitle: 'about_title',
                aboutDescription: 'about_description',
                aboutImage: 'about_image',
                heroImage: 'hero_image',
                suitsSectionImage: 'suits_section_image',
                shirtsSectionImage: 'shirts_section_image',
                blazersSectionImage: 'blazers_section_image',
                accessoriesSectionImage: 'accessories_section_image',
                bespokeSectionImage: 'bespoke_section_image'
            };

            const textSettings = {
                about_title: settingsForm.aboutTitle || '',
                about_description: settingsForm.aboutDescription || '',
            };
                const fd = new FormData();
                Object.entries(textSettings).forEach(([key, value]) => {
                    fd.append(key, value);
                });
                Object.entries(settingsFiles).forEach(([k, f]) => {
                    const key = fieldMap[k] || k;
                    if (f) fd.append(key, f as File);
                });
                clearedSettingsImages.forEach(field => {
                    fd.append(`clear_${fieldMap[field]}`, 'true');
                });
                await updateSiteSettings(fd);
            setSettingsFiles({});
            setClearedSettingsImages(new Set());
            showToast('تنظیمات ذخیره شد');
        } catch (err) {
            setSaveError(errorMessage(err, 'خطا در ذخیره تنظیمات'));
        } finally {
            setSaving(false);
        }
    };
    const handleSettingsFileUpload = (field: keyof SiteSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSettingsFiles(prev => ({ ...prev, [field]: file }));
            setClearedSettingsImages(prev => {
                const next = new Set(prev);
                next.delete(field);
                return next;
            });
            e.target.value = '';
        }
    };

return <>
                    <div className="animate-in fade-in duration-500 space-y-6">
                        <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                            <h1 className="text-xl font-bold text-lux-black dark:text-white flex items-center gap-2">
                                <SettingsIcon className="text-lux-gold"/> تنظیمات عمومی
                            </h1>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                            <form onSubmit={handleSaveSettings} className="space-y-8">
                                {saveError && <p role="alert" className="text-rose-600">{saveError}</p>}
                                {saving && <p role="status">در حال ذخیره تنظیمات…</p>}
                                <fieldset disabled={saving} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 space-y-2">
                                        <label htmlFor="settings-title" className="text-sm font-bold text-lux-black dark:text-white">عنوان صفحه "درباره ما"</label>
                                        <input
                                            id="settings-title"
                                            type="text"
                                            value={settingsForm.aboutTitle}
                                            onChange={e => setSettingsForm({ ...settingsForm, aboutTitle: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-lux-black dark:text-white focus:border-lux-gold outline-none transition-colors"
                                        />
                                    </div>

                                    <div className="md:col-span-2 space-y-2">
                                        <label htmlFor="settings-description" className="text-sm font-bold text-lux-black dark:text-white">متن "درباره ما"</label>
                                        <textarea
                                            id="settings-description"
                                            rows={5}
                                            value={settingsForm.aboutDescription}
                                            onChange={e => setSettingsForm({ ...settingsForm, aboutDescription: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-lux-black dark:text-white focus:border-lux-gold outline-none transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-zinc-800">
                                    <h3 className="font-bold text-lg text-lux-black dark:text-white">تصاویر سایت</h3>
                                    <div className="grid grid-cols-1 gap-6">
                                        {([
                                            { key: 'aboutImage', label: 'عکس صفحه درباره ما' },
                                            { key: 'heroImage', label: 'بنر اصلی صفحه نخست' },
                                            { key: 'suitsSectionImage', label: 'بنر بخش کت و شلوار' },
                                            { key: 'shirtsSectionImage', label: 'بنر بخش پیراهن' },
                                            { key: 'blazersSectionImage', label: 'بنر بخش کت تک' },
                                            { key: 'accessoriesSectionImage', label: 'بنر بخش اکسسوری' },
                                            { key: 'bespokeSectionImage', label: 'بنر بخش دوخت سفارشی' }
                                        ] as const).map(field => (
                                            <div key={field.key} className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
                                                <div className="flex flex-col sm:flex-row gap-4 items-start">
                                                    <div className="w-full sm:w-32 h-20 bg-gray-200 dark:bg-zinc-700 rounded-lg overflow-hidden shrink-0 shadow-inner">
                                                        {previews[field.key] || settingsForm[field.key] ? (
                                                            <ImageLoader src={previews[field.key] || settingsForm[field.key] as string} alt={field.label} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-400"><Package size={20}/></div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 w-full">
                                                        <label htmlFor={`settings-${field.key}`} className="text-sm font-bold text-lux-black dark:text-white mb-2 block">{field.label}</label>
                                                        <div className="flex gap-2">
                                                            <label className="flex-1 cursor-pointer">
                                                                <span className="flex items-center justify-center gap-2 w-full p-2.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
                                                                    <Upload size={16}/> آپلود تصویر جدید
                                                                </span>
                                                                <input id={`settings-${field.key}`} type="file" accept="image/*" className="w-full text-sm" onChange={handleSettingsFileUpload(field.key)} />
                                                            </label>
                                                            {(previews[field.key] || settingsForm[field.key]) && (
                                                                <button
                                                                    aria-label={`حذف ${field.label}`}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newFiles = { ...settingsFiles };
                                                                        delete newFiles[field.key];
                                                                        setSettingsFiles(newFiles);
                                                                        setClearedSettingsImages(prev => new Set(prev).add(field.key));
                                                                        setSettingsForm({ ...settingsForm, [field.key]: '' });
                                                                    }}
                                                                    className="p-2.5 text-rose-500 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end sticky bottom-0 bg-white dark:bg-zinc-900 py-4 border-t border-gray-100 dark:border-zinc-800 mt-8">
                                    <button
                                        type="submit"
                                        className="px-8 py-3 bg-lux-gold text-white font-bold rounded-xl hover:bg-lux-gold-dark shadow-lg shadow-lux-gold/20 hover:shadow-xl hover:shadow-lux-gold/30 transition-all flex items-center gap-2"
                                    >
                                        <Save size={20} /> ذخیره تغییرات
                                    </button>
                                </div>
                                </fieldset>
                            </form>
                        </div>
                    </div>

</>;
}
