"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewGamePage() {
  // const router = useRouter(); // TODO: Implement navigation after form submission
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    shortDescription: "",
    genre: "arcade",
    playInstructions: "",
    assetBundleUrl: "",
    thumbnailUrl: "",
    tags: "",
    estimatedDurationSeconds: 60,
    status: "draft",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement game creation with Supabase
    alert("Game creation will be implemented with Supabase integration");
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin/games"
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-3xl font-bold">Add New Game</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      title: e.target.value,
                      slug: generateSlug(e.target.value),
                    });
                  }}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white"
                  placeholder="e.g., Super Jump"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white font-mono text-sm"
                  placeholder="super-jump"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Short Description *</label>
                <textarea
                  required
                  value={formData.shortDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, shortDescription: e.target.value })
                  }
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white"
                  rows={3}
                  placeholder="Brief description of the game"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Genre</label>
                <select
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white"
                >
                  <option value="arcade">Arcade</option>
                  <option value="puzzle">Puzzle</option>
                  <option value="action">Action</option>
                  <option value="strategy">Strategy</option>
                  <option value="educational">Educational</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Play Instructions</label>
                <input
                  type="text"
                  value={formData.playInstructions}
                  onChange={(e) =>
                    setFormData({ ...formData, playInstructions: e.target.value })
                  }
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white"
                  placeholder="How to play the game"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Assets</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Game URL *</label>
                <input
                  type="text"
                  required
                  value={formData.assetBundleUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, assetBundleUrl: e.target.value })
                  }
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white font-mono text-sm"
                  placeholder="/games/my-game/index.html"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Thumbnail URL</label>
                <input
                  type="url"
                  value={formData.thumbnailUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, thumbnailUrl: e.target.value })
                  }
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white"
                  placeholder="https://example.com/thumbnail.jpg"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Additional Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white"
                  placeholder="arcade, fun, casual (comma separated)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Estimated Duration (seconds)
                </label>
                <input
                  type="number"
                  value={formData.estimatedDurationSeconds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimatedDurationSeconds: parseInt(e.target.value) || 60,
                    })
                  }
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white"
                  min="10"
                  max="600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold transition-colors"
            >
              Create Game
            </button>
            <Link
              href="/admin/games"
              className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-lg font-semibold text-center transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}