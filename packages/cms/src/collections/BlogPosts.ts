import type { CollectionConfig } from 'payload';

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'status', 'publishedAt'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly identifier, e.g. "hello-world"',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Short description for SEO and previews',
      },
    },
    {
      name: 'content',
      type: 'richText',
    },
    {
      name: 'coverUrl',
      type: 'text',
      admin: {
        description: 'Cover image URL',
      },
    },
    {
      name: 'category',
      type: 'select',
      options: [
        { label: '产品更新', value: 'update' },
        { label: '教程', value: 'tutorial' },
        { label: '创作者故事', value: 'story' },
        { label: '行业观察', value: 'insight' },
      ],
      defaultValue: 'update',
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'author',
      type: 'text',
      defaultValue: 'Meathill',
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: '草稿', value: 'draft' },
        { label: '已发布', value: 'published' },
      ],
      defaultValue: 'draft',
      required: true,
    },
  ],
};
