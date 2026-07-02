// import { useState, useEffect } from "react";
// import {
//   Dialog,
//   DialogBackdrop,
//   DialogPanel,
//   Tab,
//   TabGroup,
//   TabList,
//   TabPanel,
//   TabPanels,
// } from "@headlessui/react";
// import { IoSettingsSharp } from "react-icons/io5";
import { guidelines } from "@ui/data/guidelines.ts";

/* ------------------------------------------------------------------ */
/* Guidelines tab                                                       */
/* ------------------------------------------------------------------ */

export default function Guidelines() {
  return (
    <div className="flex-1 overflow-y-auto bg-white p-2">
      <div className="space-y-3">
        {guidelines.map(
          ({ title, content }: { title: string; content: string }) => {
            return (
              <div
                key={title}
                className="flex flex-col px-2 py-2  sm:gap-4 sm:px-0"
              >
                <h3 className="text-base/7 font-semibold text-black">
                  {title}
                </h3>
                <p className="mt-1 max-w-2xl text-sm/6 text-gray-400">
                  {content}
                </p>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

// export default function GuidelinesDialog() {
//   const [open, setOpen] = useState(false);

//   useEffect(() => {
//     if (open) {
//       window.parent.postMessage(
//         {
//           type: "OPEN_GUIDELINES",
//         },
//         "*"
//       );
//     } else {
//       window.parent.postMessage(
//         {
//           type: "CLOSE_GUIDELINES",
//         },
//         "*"
//       );
//     }
//   }, [open]);

//   return (
//     <div>
//       <button
//         onClick={() => setOpen(true)}
//         className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
//       >
//         <IoSettingsSharp />
//       </button>
//       <Dialog open={open} onClose={setOpen} className="relative z-10">
//         <DialogBackdrop
//           transition
//           className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
//         />

//         <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
//           <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
//             <DialogPanel
//               transition
//               className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95"
//             >
//               <div className="bg-white h-136 w-98 sm:p-4 sm:py-2">
//                 <TabGroup>
//                   <TabList className="my-4 border-black/10 flex gap-4">
//                     <Tab className="rounded-sm py-2 px-2 text-sm/6 font-semibold text-black focus:not-data-focus:outline-none data-focus:outline data-focus:outline-white data-hover:bg-white/5  data-selected:bg-blue-500 data-selected:text-white">
//                       Guideline
//                     </Tab>
//                     <Tab className="rounded-sm py-2 px-2 text-sm/6 font-semibold text-black focus:not-data-focus:outline-none data-focus:outline data-focus:outline-white data-hover:bg-white/5  data-selected:bg-blue-500 data-selected:text-white">
//                       Preferences
//                     </Tab>
//                   </TabList>
//                   <TabPanels>
//                     <TabPanel>
//                       <div className="px-4 sm:px-0">
//                         <h3 className="text-base/7 font-semibold text-black">
//                           Looma GuideLines
//                         </h3>
//                         <p className="mt-1 max-w-2xl text-sm/6 text-gray-400">
//                           read and get most out of looma
//                         </p>
//                       </div>
//                       <div className="mt-6 border-t border-black/10 max-h-92 overflow-y-auto">
//                         <dl className="divide-y divide-black/10">
//                           {guidelines.map(({ title, content }) => {
//                             return (
//                               <div
//                                 key={title}
//                                 className="flex flex-col px-4 py-6  sm:gap-4 sm:px-0"
//                               >
//                                 <h3 className="text-base/7 font-semibold text-black">
//                                   {title}
//                                 </h3>
//                                 <p className="mt-1 max-w-2xl text-sm/6 text-gray-400">
//                                   {content}
//                                 </p>
//                               </div>
//                             );
//                           })}
//                         </dl>
//                       </div>
//                     </TabPanel>
//                     <TabPanel>
//                       <form>
//                         <div className="space-y-12">
//                           <div className="border-b border-white/10 pb-12">
//                             <p className="mt-1 text-sm/6 text-gray-400">
//                               This information will be displayed publicly so be
//                               careful what you share.
//                             </p>

//                             <div className="flex mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
//                               <div className="sm:col-span-3">
//                                 <label
//                                   htmlFor="first-name"
//                                   className="block text-sm/6 font-medium "
//                                 >
//                                   First name
//                                 </label>
//                                 <div className="mt-2">
//                                   <input
//                                     id="first-name"
//                                     name="first-name"
//                                     type="text"
//                                     autoComplete="given-name"
//                                     placeholder="Name..."
//                                     className="block w-full rounded-md bg-white/5 px-3 py-1.5 placeholder:text-gray-500 outline-1 -outline-offset-1 outline-white/10 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
//                                   />
//                                 </div>
//                               </div>
//                               <p>What kind of project is this?</p>

//                               <div className="mt-6 flex items-center justify-end gap-x-6">
//                                 <button
//                                   type="submit"
//                                   className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
//                                 >
//                                   Save
//                                 </button>
//                               </div>
//                             </div>
//                           </div>
//                         </div>
//                       </form>
//                     </TabPanel>
//                   </TabPanels>
//                 </TabGroup>
//               </div>
//             </DialogPanel>
//           </div>
//         </div>
//       </Dialog>
//     </div>
//   );
// }
