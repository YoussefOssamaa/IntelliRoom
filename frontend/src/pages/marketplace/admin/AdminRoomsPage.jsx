import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../../config/axios.config";
import SearchInput from "../../../components/common/SearchInput"; 
import toast, { Toaster } from "react-hot-toast";
import defaultImg from "../../../../public/marketplaceImg/defaultRoomPic.jpg";

const AdminRoomsPage = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/rooms");
      if (response.data.success) {
        setRooms(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      toast.error("Failed to load rooms");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const filteredRooms = rooms.filter(room => {
    const query = searchQuery.toLowerCase();
    return (
      room.name.toLowerCase().includes(query) || 
      room.slug.toLowerCase().includes(query) ||
      (room.description && room.description.toLowerCase().includes(query))
    );
  });

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the room "${name}"?`)) {
      try {
        await axios.delete(`/rooms/${id}`);
        setRooms(prev => prev.filter(r => r._id !== id));
        toast.success("Room deleted successfully!");
      } catch (error) {
        console.error("Delete error:", error);
        toast.error("Failed to delete room.");
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 relative">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-[#e0e0e0] shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Rooms</h1>
          <p className="text-sm text-gray-500 mt-1">Manage shop-by-room categories and their banner images.</p>
        </div>
        <button
          onClick={() => navigate("/ecomm/admin/rooms/create")}
          className="bg-text-accent text-white font-bold py-2.5 px-5 rounded-xl shadow-sm hover:bg-green-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add New Room
        </button>
      </div>

      {/* Table & Controls */}
      <div className="bg-white rounded-2xl border border-[#e0e0e0] shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between bg-gray-50">
          <div className="relative w-full max-w-sm">
            <SearchInput 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Search rooms by name or slug..." 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs text-gray-700 uppercase font-bold border-b border-[#e0e0e0]">
              <tr>
                <th className="px-6 py-4">Room Details</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-text-accent mx-auto"></div>
                  </td>
                </tr>
              ) : filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-gray-500 font-medium">
                    {searchQuery ? `No rooms found matching "${searchQuery}"` : "No rooms found. Time to create one!"}
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => {
                  const thumbnailSrc = room.media?.thumbnailUrl;

                  return (
                    <tr key={room._id} className="bg-white border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-4">
                        <div className="w-16 h-12 relative bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200 rounded-lg">
                          <img
                            src={thumbnailSrc}
                            alt={room.name}
                            className="absolute top-0 left-0 w-full h-full object-cover !rounded-none"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                        <div>
                          <div className="font-bold text-text-primary capitalize">{room.name}</div>
                          {room.description && (
                            <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{room.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{room.slug}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${room.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {room.isActive !== false ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => navigate(`/ecomm/admin/rooms/edit/${room._id}`)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-accent hover:bg-[#f0fdf4] transition-colors"
                            title="Edit Room"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDelete(room._id, room.name)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete Room"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminRoomsPage;