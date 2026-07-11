import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/data_providers.dart';
import '../widgets/donor_avatar.dart';

class DonorListScreen extends StatefulWidget {
  const DonorListScreen({super.key});

  @override
  State<DonorListScreen> createState() => _DonorListScreenState();
}

class _DonorListScreenState extends State<DonorListScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.delayed(Duration.zero, () {
      if (mounted) {
        _loadDonors();
      }
    });
  }

  void _loadDonors() {
    Provider.of<DonorProvider>(context, listen: false).fetchDonors(
      search: _searchController.text.trim(),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dp = Provider.of<DonorProvider>(context);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Donors Database'),
      ),
      backgroundColor: theme.colorScheme.surface,
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                labelText: 'Search Donor Name or Mobile...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    _loadDonors();
                  },
                ),
                border: const OutlineInputBorder(),
              ),
              onChanged: (val) => _loadDonors(),
              onSubmitted: (_) => _loadDonors(),
            ),
          ),

          // Donors List
          Expanded(
            child: dp.isLoading
                ? const Center(child: CircularProgressIndicator())
                : dp.donors.isEmpty
                    ? const Center(child: Text('No donors registered yet.'))
                    : ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: dp.donors.length,
                        itemBuilder: (context, index) {
                          final donor = dp.donors[index];

                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: DonorAvatar(name: donor.name),
                              title: Text(
                                donor.name,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                              subtitle: Text(
                                  'Mobile: ${donor.mobile} | Email: ${donor.email ?? "N/A"}'),
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    '₹ ${donor.totalDonated.toStringAsFixed(0)}',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: theme.colorScheme.primary,
                                    ),
                                  ),
                                  Text(
                                    '${donor.donationCount} donations',
                                    style: const TextStyle(
                                        fontSize: 10, color: Colors.grey),
                                  ),
                                ],
                              ),
                              onTap: () {
                                Navigator.pushNamed(
                                  context,
                                  '/donor-details',
                                  arguments: donor.id,
                                );
                              },
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
